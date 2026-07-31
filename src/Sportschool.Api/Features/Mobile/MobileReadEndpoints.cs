using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Mobile;

public static class MobileReadEndpoints
{
    public static RouteGroupBuilder MapMobileReadEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/me")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Parent.ToString(), UserRole.Athlete.ToString()));

        group.MapGet("/athletes", ListAthletesAsync);
        group.MapGet("/profile", GetProfileAsync);
        group.MapGet("/groups", ListGroupsAsync);
        group.MapGet("/trainings", ListTrainingsAsync);
        group.MapGet("/attendance", ListAttendanceAsync);
        group.MapGet("/payments", ListPaymentsAsync);

        return group;
    }

    private static async Task<IResult> ListAthletesAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var profiles = await CurrentAthleteProfiles(currentUser, db)
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .ToListAsync(cancellationToken);

        return Results.Ok(profiles.Select(x => MobileAthleteResponse.From(x, mediaUrls)));
    }

    private static async Task<IResult> GetProfileAsync(
        Guid? athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(athleteProfileId, currentUser, db, cancellationToken);
        return profile is null ? Results.NotFound() : Results.Ok(MobileProfileResponse.From(profile, mediaUrls));
    }

    private static async Task<IResult> ListGroupsAsync(
        Guid? athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(athleteProfileId, currentUser, db, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var groups = await db.GroupAthletes
            .Where(x => x.AthleteProfileId == profile.Id && x.Group.IsActive)
            .OrderBy(x => x.Group.Name)
            .Select(x => GroupResponse.From(x.Group))
            .ToListAsync(cancellationToken);

        return Results.Ok(groups);
    }

    private static async Task<IResult> ListTrainingsAsync(
        Guid? athleteProfileId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(athleteProfileId, currentUser, db, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var start = from ?? LocalDayRange.StartOfToday(timeZone);
        var end = to ?? start.AddDays(30);
        if (end <= start)
        {
            return Results.BadRequest();
        }

        var groupIds = db.GroupAthletes
            .Where(x => x.AthleteProfileId == profile.Id)
            .Select(x => x.GroupId);

        var trainings = await db.TrainingSessions
            .Where(x => x.SchoolId == profile.SchoolId
                && x.IsActive
                && x.Groups.Any(group => groupIds.Contains(group.GroupId))
                && x.StartsAt >= start
                && x.StartsAt < end)
            .OrderBy(x => x.StartsAt)
            .Select(x => new TrainingResponse(
                x.Id,
                x.Groups
                    .OrderBy(group => group.Group.Name)
                    .Select(group => new TrainingGroupSummary(group.GroupId, group.Group.Name))
                    .ToArray(),
                x.CoachId,
                x.Title,
                x.StartsAt,
                x.EndsAt,
                x.Recurrence,
                x.RecurrenceEndsOn,
                x.Location,
                x.Notes,
                x.StartedAt,
                x.StartedByUserId,
                x.CompletedAt,
                x.CompletedByUserId))
            .ToListAsync(cancellationToken);

        return Results.Ok(trainings);
    }

    private static async Task<IResult> ListAttendanceAsync(
        Guid? athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(athleteProfileId, currentUser, db, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var attendance = await db.AttendanceRecords
            .Where(x => x.SchoolId == profile.SchoolId
                && x.AthleteProfileId == profile.Id
                && x.Status != null)
            .OrderByDescending(x => x.TrainingSession.StartsAt)
            .Select(x => AttendanceResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(attendance);
    }

    private static async Task<IResult> ListPaymentsAsync(
        Guid? athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(athleteProfileId, currentUser, db, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var today = DateOnly.FromDateTime(LocalDayRange.StartOfToday(timeZone).DateTime);
        var existing = await db.StudentPayments
            .AsNoTracking()
            .Where(x => x.SchoolId == profile.SchoolId
                && x.AthleteProfileId == profile.Id)
            .ToListAsync(cancellationToken);

        var school = await db.Schools
            .AsNoTracking()
            .Where(x => x.Id == profile.SchoolId)
            .Select(x => new { x.DefaultMonthlyFee, x.PaymentDayOfMonth })
            .FirstOrDefaultAsync(cancellationToken);

        var payments = existing.Select(x => PaymentResponse.From(x, today)).ToList();

        var effectiveFee = school is null
            ? null
            : PaymentSchedule.EffectiveFee(school.DefaultMonthlyFee, profile.MonthlyFeeOverride);

        if (effectiveFee is > 0 && school is not null)
        {
            var recordedMonths = existing.Select(x => (x.Year, x.Month)).ToHashSet();
            foreach (var (year, month) in ActivePayableMonths(today, school.PaymentDayOfMonth))
            {
                if (recordedMonths.Add((year, month)))
                {
                    payments.Add(PaymentResponse.Synthetic(profile.Id, year, month, effectiveFee.Value, today));
                }
            }
        }

        var ordered = payments
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .ToList();

        return Results.Ok(ordered);
    }

    // The months a member should currently see as payable: the current month, plus next month
    // once it has activated on the school's payment day.
    private static IEnumerable<(int Year, int Month)> ActivePayableMonths(DateOnly today, int? paymentDay)
    {
        yield return (today.Year, today.Month);

        var next = new DateOnly(today.Year, today.Month, 1).AddMonths(1);
        if (PaymentSchedule.IsMonthActive(next.Year, next.Month, paymentDay, today))
        {
            yield return (next.Year, next.Month);
        }
    }

    private static Task<Athletes.AthleteProfile?> FindCurrentAthleteProfileAsync(
        Guid? athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var query = CurrentAthleteProfiles(currentUser, db);
        if (athleteProfileId is not null)
        {
            query = query.Where(x => x.Id == athleteProfileId.Value);
        }

        return query
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static IQueryable<Athletes.AthleteProfile> CurrentAthleteProfiles(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var userId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || userId is null)
        {
            return db.AthleteProfiles.Where(x => false);
        }

        return db.AthleteProfiles.Where(
            x => x.SchoolId == schoolId.Value
                && (x.UserId == userId.Value || x.ParentUserId == userId.Value)
                && x.IsActive);
    }
}

public sealed record MobileAthleteResponse(
    Guid Id,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    string? ProfileImageUrl)
{
    public static MobileAthleteResponse From(Athletes.AthleteProfile profile, MediaAccessUrlService mediaUrls)
    {
        return new MobileAthleteResponse(
            profile.Id,
            profile.FirstName,
            profile.LastName,
            profile.BirthDate,
            profile.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(profile.SchoolId, profile.Id, profile.ProfileImageVersion));
    }
}

public sealed record MobileProfileResponse(
    Guid Id,
    Guid UserId,
    Guid SchoolId,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    string ParentFullName,
    string ParentPhone,
    string? ProfileImageUrl)
{
    public static MobileProfileResponse From(Athletes.AthleteProfile profile, MediaAccessUrlService mediaUrls)
    {
        return new MobileProfileResponse(
            profile.Id,
            profile.UserId,
            profile.SchoolId,
            profile.FirstName,
            profile.LastName,
            profile.BirthDate,
            profile.ParentFullName,
            profile.ParentPhone,
            profile.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(profile.SchoolId, profile.Id, profile.ProfileImageVersion));
    }
}
