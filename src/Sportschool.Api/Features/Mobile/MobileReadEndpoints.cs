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
        CancellationToken cancellationToken)
    {
        var profiles = await CurrentAthleteProfiles(currentUser, db)
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => MobileAthleteResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(profiles);
    }

    private static async Task<IResult> GetProfileAsync(
        Guid? athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(athleteProfileId, currentUser, db, cancellationToken);
        return profile is null ? Results.NotFound() : Results.Ok(MobileProfileResponse.From(profile));
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
        CancellationToken cancellationToken)
    {
        var profile = await FindCurrentAthleteProfileAsync(athleteProfileId, currentUser, db, cancellationToken);
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
                x.Notes))
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
            .Where(x => x.SchoolId == profile.SchoolId && x.AthleteProfileId == profile.Id)
            .OrderByDescending(x => x.TrainingSession.StartsAt)
            .Select(x => AttendanceResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(attendance);
    }

    private static async Task<IResult> ListPaymentsAsync(
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
    DateOnly BirthDate)
{
    public static MobileAthleteResponse From(Athletes.AthleteProfile profile)
    {
        return new MobileAthleteResponse(
            profile.Id,
            profile.FirstName,
            profile.LastName,
            profile.BirthDate);
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
