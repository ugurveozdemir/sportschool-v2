using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Announcements;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Trainings;

public static class TrainingLifecycleEndpoints
{
    public static IEndpointRouteBuilder MapTrainingLifecycleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/coach/trainings")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Coach.ToString()));

        group.MapPost("/{trainingId:guid}/start", StartTrainingAsync);
        group.MapPost("/{trainingId:guid}/complete", CompleteTrainingAsync);

        return app;
    }

    private static async Task<IResult> StartTrainingAsync(
        Guid trainingId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var training = await db.TrainingSessions
            .FirstOrDefaultAsync(x => x.Id == trainingId
                && x.SchoolId == context.Value.SchoolId
                && x.CoachId == context.Value.CoachId
                && x.IsActive, cancellationToken);
        if (training is null)
        {
            return Results.NotFound();
        }

        if (training.StartedAt is not null || training.CompletedAt is not null)
        {
            return Results.Conflict(new { detail = "Bu antrenman zaten başlatılmış veya tamamlanmış." });
        }

        var now = DateTimeOffset.UtcNow;
        var startWindow = training.StartsAt.AddHours(-2);
        if (now < startWindow)
        {
            return Results.Conflict(new
            {
                detail = "Antrenman başlangıçtan 2 saat önce başlatılabilir.",
                availableAt = startWindow
            });
        }

        var groupIds = await db.TrainingSessionGroups
            .Where(x => x.TrainingSessionId == trainingId)
            .Select(x => x.GroupId)
            .ToArrayAsync(cancellationToken);

        var athleteIds = await db.GroupAthletes
            .Where(x => groupIds.Contains(x.GroupId)
                && x.AthleteProfile.SchoolId == context.Value.SchoolId
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive)
            .Select(x => x.AthleteProfileId)
            .Distinct()
            .ToArrayAsync(cancellationToken);

        training.StartedAt = now;
        training.StartedByUserId = context.Value.CoachId;

        var existingAttendanceAthleteIds = await db.AttendanceRecords
            .Where(x => x.TrainingSessionId == trainingId && athleteIds.Contains(x.AthleteProfileId))
            .Select(x => x.AthleteProfileId)
            .ToHashSetAsync(cancellationToken);

        db.AttendanceRecords.AddRange(athleteIds
            .Where(athleteId => !existingAttendanceAthleteIds.Contains(athleteId))
            .Select(athleteId => new AttendanceRecord
            {
                SchoolId = context.Value.SchoolId,
                TrainingSessionId = trainingId,
                AthleteProfileId = athleteId
            }));

        var coachName = await db.Users
            .Where(x => x.Id == context.Value.CoachId)
            .Select(x => x.FullName)
            .SingleAsync(cancellationToken);

        db.Announcements.Add(new Announcement
        {
            SchoolId = context.Value.SchoolId,
            TrainingSessionId = trainingId,
            CreatedByUserId = context.Value.CoachId,
            Title = $"{training.Title} başladı",
            Content = $"{training.Title} antrenmanı {coachName} tarafından başlatıldı.",
            CreatedAt = now,
            PublishedAt = now
        });

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(TrainingLifecycleResponse.From(training));
    }

    private static async Task<IResult> CompleteTrainingAsync(
        Guid trainingId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var training = await db.TrainingSessions
            .FirstOrDefaultAsync(x => x.Id == trainingId
                && x.SchoolId == context.Value.SchoolId
                && x.CoachId == context.Value.CoachId
                && x.IsActive, cancellationToken);
        if (training is null)
        {
            return Results.NotFound();
        }

        if (training.StartedAt is null)
        {
            return Results.Conflict(new { detail = "Başlatılmamış antrenman bitirilemez." });
        }

        if (training.CompletedAt is not null)
        {
            return Results.Conflict(new { detail = "Bu antrenman zaten tamamlanmış." });
        }

        var missingAttendanceCount = await db.AttendanceRecords
            .CountAsync(x => x.TrainingSessionId == trainingId && x.Status == null, cancellationToken);
        if (missingAttendanceCount > 0)
        {
            return Results.Conflict(new
            {
                detail = "Antrenmanı bitirmek için tüm oyuncuların yoklamasını tamamlayın.",
                missingAttendanceCount
            });
        }

        training.CompletedAt = DateTimeOffset.UtcNow;
        training.CompletedByUserId = context.Value.CoachId;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(TrainingLifecycleResponse.From(training));
    }

    private static CoachContext? GetCoachContext(ClaimsPrincipal currentUser)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var coachId = CurrentUser.GetUserId(currentUser);
        return schoolId is null || coachId is null ? null : new CoachContext(schoolId.Value, coachId.Value);
    }
}

public readonly record struct CoachContext(Guid SchoolId, Guid CoachId);

public sealed record TrainingLifecycleResponse(
    Guid TrainingId,
    string Status,
    DateTimeOffset? StartedAt,
    Guid? StartedByUserId,
    DateTimeOffset? CompletedAt,
    Guid? CompletedByUserId)
{
    public static TrainingLifecycleResponse From(TrainingSession training)
    {
        return new TrainingLifecycleResponse(
            training.Id,
            training.CompletedAt is not null ? "Completed" : training.StartedAt is not null ? "InProgress" : "Scheduled",
            training.StartedAt,
            training.StartedByUserId,
            training.CompletedAt,
            training.CompletedByUserId);
    }
}
