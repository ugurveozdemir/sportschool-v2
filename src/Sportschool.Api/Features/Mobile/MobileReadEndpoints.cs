using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Groups;
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

        group.MapGet("/profile", GetProfileAsync);
        group.MapGet("/groups", ListGroupsAsync);
        group.MapGet("/trainings", ListTrainingsAsync);
        group.MapGet("/attendance", ListAttendanceAsync);
        group.MapGet("/payments", ListPaymentsAsync);

        return group;
    }

    private static async Task<IResult> GetProfileAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(currentUser, db, cancellationToken);
        return profile is null ? Results.NotFound() : Results.Ok(MobileProfileResponse.From(profile));
    }

    private static async Task<IResult> ListGroupsAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(currentUser, db, cancellationToken);
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
        DateTimeOffset? from,
        DateTimeOffset? to,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(currentUser, db, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        var start = from ?? new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
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
                && groupIds.Contains(x.GroupId)
                && x.StartsAt >= start
                && x.StartsAt < end)
            .OrderBy(x => x.StartsAt)
            .Select(x => TrainingResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(trainings);
    }

    private static async Task<IResult> ListAttendanceAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(currentUser, db, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var attendance = await db.AttendanceRecords
            .Where(x => x.SchoolId == profile.SchoolId && x.AthleteProfileId == profile.Id)
            .OrderByDescending(x => x.TrainingSession.StartsAt)
            .Select(x => AttendanceResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(attendance);
    }

    private static async Task<IResult> ListPaymentsAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(currentUser, db, cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var payments = await db.StudentPayments
            .Where(x => x.SchoolId == profile.SchoolId && x.AthleteProfileId == profile.Id)
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .Select(x => PaymentResponse.From(x, today))
            .ToListAsync(cancellationToken);

        return Results.Ok(payments);
    }

    private static Task<Athletes.AthleteProfile?> FindCurrentAthleteProfileAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var userId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || userId is null)
        {
            return Task.FromResult<Athletes.AthleteProfile?>(null);
        }

        return db.AthleteProfiles.FirstOrDefaultAsync(
            x => x.SchoolId == schoolId.Value
                && (x.UserId == userId.Value || x.ParentUserId == userId.Value)
                && x.IsActive,
            cancellationToken);
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
    string ParentPhone)
{
    public static MobileProfileResponse From(Athletes.AthleteProfile profile)
    {
        return new MobileProfileResponse(
            profile.Id,
            profile.UserId,
            profile.SchoolId,
            profile.FirstName,
            profile.LastName,
            profile.BirthDate,
            profile.ParentFullName,
            profile.ParentPhone);
    }
}
