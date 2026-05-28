using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Trainings;

public static class TrainingEndpoints
{
    public static RouteGroupBuilder MapTrainingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        group.MapPost("/trainings", CreateTrainingAsync);
        group.MapGet("/trainings", ListTrainingsAsync);
        group.MapPut("/trainings/{id:guid}", UpdateTrainingAsync);
        group.MapDelete("/trainings/{id:guid}", DeactivateTrainingAsync);
        group.MapGet("/groups/{groupId:guid}/trainings", ListGroupTrainingsAsync);

        return group;
    }

    private static async Task<IResult> ListTrainingsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var now = DateTimeOffset.UtcNow;
        var start = from ?? new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var end = to ?? start.AddDays(7);
        if (end <= start)
        {
            return Results.BadRequest();
        }

        var trainingRows = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive)
            .Select(x => new TrainingListResponse(
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
                new AttendanceSummary(
                    x.Groups
                        .SelectMany(group => group.Group.Athletes)
                        .Where(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)
                        .Select(a => a.AthleteProfileId)
                        .Distinct()
                        .Count(),
                    db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id))))
            .ToListAsync(cancellationToken);
        var trainings = trainingRows
            .Where(x => x.StartsAt >= start && x.StartsAt < end)
            .OrderBy(x => x.StartsAt)
            .ToList();

        return Results.Ok(trainings);
    }

    private static async Task<IResult> CreateTrainingAsync(
        CreateTrainingRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var userId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || userId is null)
        {
            return Results.Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Title)
            || request.EndsAt <= request.StartsAt
            || !Enum.IsDefined(request.Recurrence))
        {
            return Results.BadRequest();
        }

        var groupIds = NormalizeGroupIds(request.GroupIds);
        if (groupIds is null)
        {
            return Results.BadRequest();
        }

        if (request.Recurrence == TrainingRecurrence.Weekly)
        {
            if (request.RecurrenceEndsOn is null)
            {
                return Results.BadRequest();
            }

            var limitDate = DateOnly.FromDateTime(request.StartsAt.UtcDateTime).AddYears(1);
            if (request.RecurrenceEndsOn.Value > limitDate)
            {
                return Results.BadRequest();
            }
        }

        var groups = await GetActiveGroupsAsync(groupIds, schoolId.Value, db, cancellationToken);
        if (groups.Count != groupIds.Length)
        {
            return Results.NotFound();
        }

        var sessions = new List<TrainingSession>();
        if (request.Recurrence == TrainingRecurrence.Weekly)
        {
            var currentStartsAt = request.StartsAt;
            var currentEndsAt = request.EndsAt;
            var occurrenceDate = DateOnly.FromDateTime(currentStartsAt.UtcDateTime);

            while (occurrenceDate <= request.RecurrenceEndsOn!.Value)
            {
                sessions.Add(CreateTrainingSession(
                    schoolId.Value,
                    userId.Value,
                    groupIds,
                    request,
                    currentStartsAt,
                    currentEndsAt));

                currentStartsAt = currentStartsAt.AddDays(7);
                currentEndsAt = currentEndsAt.AddDays(7);
                occurrenceDate = DateOnly.FromDateTime(currentStartsAt.UtcDateTime);
            }

            if (sessions.Count == 0)
            {
                return Results.BadRequest();
            }
        }
        else
        {
            sessions.Add(CreateTrainingSession(
                schoolId.Value,
                userId.Value,
                groupIds,
                request,
                request.StartsAt,
                request.EndsAt));
        }

        db.TrainingSessions.AddRange(sessions);
        await db.SaveChangesAsync(cancellationToken);

        var firstSession = sessions[0];
        return Results.Created(
            $"/api/school/trainings/{firstSession.Id}",
            TrainingResponse.From(firstSession, groups.Select(x => new TrainingGroupSummary(x.Id, x.Name)).ToArray()));
    }

    private static async Task<IResult> ListGroupTrainingsAsync(
        Guid groupId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var groupExists = await db.TrainingGroups.AnyAsync(
            x => x.Id == groupId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!groupExists)
        {
            return Results.NotFound();
        }

        var trainings = await db.TrainingSessions
            .Where(x => x.SchoolId == schoolId.Value
                && x.IsActive
                && x.Groups.Any(group => group.GroupId == groupId))
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

    private static async Task<IResult> UpdateTrainingAsync(
        Guid id,
        UpdateTrainingRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Title)
            || request.EndsAt <= request.StartsAt)
        {
            return Results.BadRequest();
        }

        var groupIds = NormalizeGroupIds(request.GroupIds);
        if (groupIds is null)
        {
            return Results.BadRequest();
        }

        var groups = await GetActiveGroupsAsync(groupIds, schoolId.Value, db, cancellationToken);
        if (groups.Count != groupIds.Length)
        {
            return Results.NotFound();
        }

        var training = await db.TrainingSessions.FirstOrDefaultAsync(
            x => x.Id == id && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (training is null)
        {
            return Results.NotFound();
        }

        training.Title = request.Title.Trim();
        training.StartsAt = request.StartsAt;
        training.EndsAt = request.EndsAt;
        training.Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim();
        training.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        var currentGroups = await db.TrainingSessionGroups
            .Where(x => x.TrainingSessionId == id)
            .ToListAsync(cancellationToken);
        db.TrainingSessionGroups.RemoveRange(currentGroups);
        foreach (var groupId in groupIds)
        {
            db.TrainingSessionGroups.Add(new TrainingSessionGroup
            {
                TrainingSessionId = id,
                GroupId = groupId
            });
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeactivateTrainingAsync(
        Guid id,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var training = await db.TrainingSessions.FirstOrDefaultAsync(
            x => x.Id == id && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (training is null)
        {
            return Results.NotFound();
        }

        training.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static Guid[]? NormalizeGroupIds(IReadOnlyCollection<Guid> groupIds)
    {
        if (groupIds.Count == 0 || groupIds.Any(x => x == Guid.Empty))
        {
            return null;
        }

        var distinctGroupIds = groupIds.Distinct().ToArray();
        return distinctGroupIds.Length == groupIds.Count ? distinctGroupIds : null;
    }

    private static Task<List<TrainingGroup>> GetActiveGroupsAsync(
        IReadOnlyCollection<Guid> groupIds,
        Guid schoolId,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        return db.TrainingGroups
            .Where(x => groupIds.Contains(x.Id) && x.SchoolId == schoolId && x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    private static TrainingSession CreateTrainingSession(
        Guid schoolId,
        Guid coachId,
        IReadOnlyCollection<Guid> groupIds,
        CreateTrainingRequest request,
        DateTimeOffset startsAt,
        DateTimeOffset endsAt)
    {
        var session = new TrainingSession
        {
            SchoolId = schoolId,
            CoachId = coachId,
            Title = request.Title.Trim(),
            StartsAt = startsAt,
            EndsAt = endsAt,
            Recurrence = request.Recurrence,
            RecurrenceEndsOn = request.Recurrence == TrainingRecurrence.Weekly ? request.RecurrenceEndsOn : null,
            Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
        };

        foreach (var groupId in groupIds)
        {
            session.Groups.Add(new TrainingSessionGroup { GroupId = groupId });
        }

        return session;
    }
}

public sealed record CreateTrainingRequest(
    IReadOnlyCollection<Guid> GroupIds,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    TrainingRecurrence Recurrence,
    DateOnly? RecurrenceEndsOn,
    string? Location,
    string? Notes);

public sealed record TrainingResponse(
    Guid Id,
    IReadOnlyCollection<TrainingGroupSummary> Groups,
    Guid CoachId,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    TrainingRecurrence Recurrence,
    DateOnly? RecurrenceEndsOn,
    string? Location,
    string? Notes)
{
    public static TrainingResponse From(TrainingSession training, IReadOnlyCollection<TrainingGroupSummary> groups)
    {
        return new TrainingResponse(
            training.Id,
            groups,
            training.CoachId,
            training.Title,
            training.StartsAt,
            training.EndsAt,
            training.Recurrence,
            training.RecurrenceEndsOn,
            training.Location,
            training.Notes);
    }
}

public sealed record UpdateTrainingRequest(
    IReadOnlyCollection<Guid> GroupIds,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string? Location,
    string? Notes);

public sealed record TrainingListResponse(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    IReadOnlyCollection<TrainingGroupSummary> Groups,
    Guid CoachId,
    string CoachName,
    string? Location,
    AttendanceSummary AttendanceSummary);

public sealed record TrainingGroupSummary(Guid Id, string Name);

public sealed record AttendanceSummary(int TotalAthletes, int RecordedCount);
