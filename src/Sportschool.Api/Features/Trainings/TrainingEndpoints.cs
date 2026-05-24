using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
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
                x.GroupId,
                x.Group.Name,
                x.CoachId,
                x.Coach.FullName,
                x.Location,
                new AttendanceSummary(
                    x.Group.Athletes.Count(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive),
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

        var groupExists = await db.TrainingGroups.AnyAsync(
            x => x.Id == request.GroupId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!groupExists)
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
                sessions.Add(new TrainingSession
                {
                    SchoolId = schoolId.Value,
                    GroupId = request.GroupId,
                    CoachId = userId.Value,
                    Title = request.Title.Trim(),
                    StartsAt = currentStartsAt,
                    EndsAt = currentEndsAt,
                    Recurrence = request.Recurrence,
                    RecurrenceEndsOn = request.RecurrenceEndsOn,
                    Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim(),
                    Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
                });

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
            sessions.Add(new TrainingSession
            {
                SchoolId = schoolId.Value,
                GroupId = request.GroupId,
                CoachId = userId.Value,
                Title = request.Title.Trim(),
                StartsAt = request.StartsAt,
                EndsAt = request.EndsAt,
                Recurrence = request.Recurrence,
                RecurrenceEndsOn = null,
                Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim(),
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
            });
        }

        db.TrainingSessions.AddRange(sessions);
        await db.SaveChangesAsync(cancellationToken);

        var firstSession = sessions[0];
        return Results.Created($"/api/school/trainings/{firstSession.Id}", TrainingResponse.From(firstSession));
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
            .Where(x => x.GroupId == groupId && x.SchoolId == schoolId.Value && x.IsActive)
            .OrderBy(x => x.StartsAt)
            .Select(x => TrainingResponse.From(x))
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
}

public sealed record CreateTrainingRequest(
    Guid GroupId,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    TrainingRecurrence Recurrence,
    DateOnly? RecurrenceEndsOn,
    string? Location,
    string? Notes);

public sealed record TrainingResponse(
    Guid Id,
    Guid GroupId,
    Guid CoachId,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    TrainingRecurrence Recurrence,
    DateOnly? RecurrenceEndsOn,
    string? Location,
    string? Notes)
{
    public static TrainingResponse From(TrainingSession training)
    {
        return new TrainingResponse(
            training.Id,
            training.GroupId,
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
    Guid GroupId,
    string GroupName,
    Guid CoachId,
    string CoachName,
    string? Location,
    AttendanceSummary AttendanceSummary);

public sealed record AttendanceSummary(int TotalAthletes, int RecordedCount);
