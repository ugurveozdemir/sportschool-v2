using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Dashboard;

public static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/school/dashboard")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        group.MapGet("/summary", GetSummaryAsync);

        return group;
    }

    private static async Task<IResult> GetSummaryAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);
        var todayStart = LocalDayRange.StartOfToday(timeZone);
        var start = from ?? todayStart;
        var end = to ?? start.AddDays(7);
        if (end <= start)
        {
            return Results.BadRequest();
        }

        var todayEnd = todayStart.AddDays(1);
        var paymentYear = localNow.Year;
        var paymentMonth = localNow.Month;
        var paymentToday = DateOnly.FromDateTime(localNow.DateTime);

        var trainingRows = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive)
            .Select(x => new DashboardTrainingItem(
                x.Id,
                x.Title,
                x.StartsAt,
                x.EndsAt,
                x.Groups
                    .OrderBy(group => group.Group.Name)
                    .Select(group => new TrainingGroupSummary(group.GroupId, group.Group.Name))
                    .ToArray(),
                x.CoachId,
                x.Coach.FullName,
                x.Location,
                x.Groups
                    .SelectMany(group => group.Group.Athletes)
                    .Where(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)
                    .Select(a => a.AthleteProfileId)
                    .Distinct()
                    .Count(),
                db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id)))
            .ToListAsync(cancellationToken);
        var trainings = trainingRows
            .Where(x => x.StartsAt >= start && x.StartsAt < end)
            .OrderBy(x => x.StartsAt)
            .ToList();

        var activeAthleteCount = await db.AthleteProfiles
            .AsNoTracking()
            .CountAsync(x => x.SchoolId == schoolId.Value && x.IsActive && x.User.IsActive, cancellationToken);
        var activeGroupCount = await db.TrainingGroups
            .AsNoTracking()
            .CountAsync(x => x.SchoolId == schoolId.Value && x.IsActive, cancellationToken);
        var paymentRows = await db.AthleteProfiles
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive && x.User.IsActive)
            .Select(x => new
            {
                Payment = db.StudentPayments.FirstOrDefault(payment =>
                    payment.SchoolId == schoolId.Value
                    && payment.AthleteProfileId == x.Id
                    && payment.Year == paymentYear
                    && payment.Month == paymentMonth)
            })
            .ToListAsync(cancellationToken);

        var unpaidPaymentCount = paymentRows.Count(x =>
            x.Payment is null || PaymentStatusCalculator.GetEffectiveStatus(x.Payment, paymentToday) != PaymentStatus.Paid);

        var reportRows = await db.AthleteReports
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value)
            .Select(x => new DashboardRecentReport(
                x.Id,
                x.AthleteProfileId,
                x.AthleteProfile.FirstName + " " + x.AthleteProfile.LastName,
                x.Summary,
                x.CreatedAt))
            .ToListAsync(cancellationToken);
        var recentReports = reportRows
            .OrderByDescending(x => x.CreatedAt)
            .Take(5)
            .ToList();

        return Results.Ok(new DashboardSummaryResponse(
            trainings.Where(x => x.StartsAt >= todayStart && x.StartsAt < todayEnd).ToArray(),
            trainings.Count,
            trainings.Count(x => x.TotalAthletes > x.RecordedAttendanceCount),
            activeAthleteCount,
            activeGroupCount,
            unpaidPaymentCount,
            recentReports));
    }
}

public sealed record DashboardSummaryResponse(
    IReadOnlyCollection<DashboardTrainingItem> TodayTrainings,
    int WeekTrainingCount,
    int MissingAttendanceCount,
    int ActiveAthleteCount,
    int ActiveGroupCount,
    int UnpaidPaymentCount,
    IReadOnlyCollection<DashboardRecentReport> RecentReports);

public sealed record DashboardTrainingItem(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    IReadOnlyCollection<TrainingGroupSummary> Groups,
    Guid CoachId,
    string CoachName,
    string? Location,
    int TotalAthletes,
    int RecordedAttendanceCount);

public sealed record DashboardRecentReport(
    Guid Id,
    Guid AthleteProfileId,
    string AthleteName,
    string Summary,
    DateTimeOffset CreatedAt);
