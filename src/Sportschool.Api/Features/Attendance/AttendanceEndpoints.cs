using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Attendance;

public static class AttendanceEndpoints
{
    public static RouteGroupBuilder MapAttendanceEndpoints(this IEndpointRouteBuilder app)
    {
        var schoolGroup = app.MapGroup("/api/school/trainings/{trainingId:guid}/attendance")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        schoolGroup.MapGet("/", ListAttendanceAsync);
        schoolGroup.MapPost("/", CreateAttendanceAsync);
        schoolGroup.MapPut("/{athleteProfileId:guid}", UpdateAttendanceAsync);

        var rosterGroup = app.MapGroup("/api/school/trainings")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        rosterGroup.MapGet("/{trainingId:guid}/attendance-roster", GetAttendanceRosterAsync);

        return schoolGroup;
    }

    private static async Task<IResult> ListAttendanceAsync(
        Guid trainingId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var trainingExists = await db.TrainingSessions.AnyAsync(
            x => x.Id == trainingId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!trainingExists)
        {
            return Results.NotFound();
        }

        var records = await db.AttendanceRecords
            .Where(x => x.SchoolId == schoolId.Value && x.TrainingSessionId == trainingId)
            .OrderBy(x => x.AthleteProfile.LastName)
            .ThenBy(x => x.AthleteProfile.FirstName)
            .Select(x => AttendanceResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(records);
    }

    private static async Task<IResult> GetAttendanceRosterAsync(
        Guid trainingId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var training = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.Id == trainingId && x.SchoolId == schoolId.Value && x.IsActive)
            .Select(x => new AttendanceRosterTraining(
                x.Id,
                x.Title,
                x.StartsAt,
                x.EndsAt,
                x.Groups
                    .OrderBy(group => group.Group.Name)
                    .Select(group => new TrainingGroupSummary(group.GroupId, group.Group.Name))
                    .ToArray(),
                x.StartedAt,
                x.StartedByUserId,
                x.CompletedAt,
                x.CompletedByUserId))
            .FirstOrDefaultAsync(cancellationToken);

        if (training is null)
        {
            return Results.NotFound();
        }

        var groupIds = training.Groups.Select(x => x.Id).ToArray();
        var rowData = training.StartedAt is not null
            ? await db.AttendanceRecords
                .AsNoTracking()
                .Where(x => x.TrainingSessionId == trainingId)
                .Select(x => new AttendanceRosterRow(
                    x.AthleteProfileId,
                    x.AthleteProfile.FirstName,
                    x.AthleteProfile.LastName,
                    x.AthleteProfile.ParentFullName,
                    x.AthleteProfile.ParentPhone,
                    x.Status))
                .ToListAsync(cancellationToken)
            : await db.GroupAthletes
                .AsNoTracking()
                .Where(x => groupIds.Contains(x.GroupId)
                    && x.AthleteProfile.SchoolId == schoolId.Value
                    && x.AthleteProfile.IsActive
                    && x.AthleteProfile.User.IsActive)
                .Select(x => new AttendanceRosterRow(
                    x.AthleteProfileId,
                    x.AthleteProfile.FirstName,
                    x.AthleteProfile.LastName,
                    x.AthleteProfile.ParentFullName,
                    x.AthleteProfile.ParentPhone,
                    null))
                .ToListAsync(cancellationToken);
        var rows = rowData
            .GroupBy(x => x.AthleteProfileId)
            .Select(x => x.First())
            .Select(x => new AttendanceRosterItem(
                x.AthleteProfileId,
                x.FirstName,
                x.LastName,
                x.ParentFullName,
                x.ParentPhone,
                x.Status))
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ToArray();

        return Results.Ok(new AttendanceRosterResponse(training, rows));
    }

    private static async Task<IResult> CreateAttendanceAsync(
        Guid trainingId,
        SaveAttendanceRequest request,
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

        if (request.AthleteProfileId == Guid.Empty || !Enum.IsDefined(request.Status))
        {
            return Results.BadRequest();
        }

        var training = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.Id == trainingId && x.SchoolId == schoolId.Value && x.IsActive)
            .Select(x => new
            {
                x.Id,
                x.StartedAt,
                x.CompletedAt,
                GroupIds = x.Groups.Select(group => group.GroupId).ToArray()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (training is null)
        {
            return Results.NotFound();
        }

        if (training.StartedAt is null || training.CompletedAt is not null)
        {
            return AttendanceLocked();
        }

        var athleteIsInGroup = await db.GroupAthletes.AnyAsync(
            x => training.GroupIds.Contains(x.GroupId)
                && x.AthleteProfileId == request.AthleteProfileId
                && x.AthleteProfile.SchoolId == schoolId.Value
                && x.AthleteProfile.IsActive,
            cancellationToken);

        if (!athleteIsInGroup)
        {
            return Results.NotFound();
        }

        var attendance = await db.AttendanceRecords.FirstOrDefaultAsync(
            x => x.TrainingSessionId == trainingId && x.AthleteProfileId == request.AthleteProfileId,
            cancellationToken);
        if (attendance is null)
        {
            return Results.NotFound();
        }

        attendance.Status = request.Status;
        attendance.RecordedByUserId = userId.Value;
        attendance.RecordedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/school/trainings/{trainingId}/attendance/{attendance.AthleteProfileId}",
            AttendanceResponse.From(attendance));
    }

    private static async Task<IResult> UpdateAttendanceAsync(
        Guid trainingId,
        Guid athleteProfileId,
        SaveAttendanceRequest request,
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

        if (request.AthleteProfileId != athleteProfileId || !Enum.IsDefined(request.Status))
        {
            return Results.BadRequest();
        }

        var attendance = await db.AttendanceRecords.FirstOrDefaultAsync(
            x => x.TrainingSessionId == trainingId
                && x.AthleteProfileId == athleteProfileId
                && x.SchoolId == schoolId.Value,
            cancellationToken);

        if (attendance is null)
        {
            return Results.NotFound();
        }

        var trainingIsEditable = await db.TrainingSessions.AnyAsync(
            x => x.Id == trainingId
                && x.SchoolId == schoolId.Value
                && x.StartedAt != null
                && x.CompletedAt == null
                && x.IsActive,
            cancellationToken);
        if (!trainingIsEditable)
        {
            return AttendanceLocked();
        }

        attendance.Status = request.Status;
        attendance.UpdatedByUserId = userId.Value;
        attendance.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AttendanceResponse.From(attendance));
    }

    private static IResult AttendanceLocked()
    {
        return Results.Problem(
            statusCode: 409,
            title: "Yoklama kilitli",
            detail: "Yoklama yalnızca başlatılmış ve tamamlanmamış antrenmanda değiştirilebilir.");
    }
}

public sealed record SaveAttendanceRequest(Guid AthleteProfileId, AttendanceStatus Status);

public sealed record AttendanceResponse(
    Guid Id,
    Guid TrainingSessionId,
    Guid AthleteProfileId,
    AttendanceStatus? Status,
    Guid? RecordedByUserId,
    Guid? UpdatedByUserId,
    DateTimeOffset? RecordedAt,
    DateTimeOffset? UpdatedAt)
{
    public static AttendanceResponse From(AttendanceRecord attendance)
    {
        return new AttendanceResponse(
            attendance.Id,
            attendance.TrainingSessionId,
            attendance.AthleteProfileId,
            attendance.Status,
            attendance.RecordedByUserId,
            attendance.UpdatedByUserId,
            attendance.RecordedAt,
            attendance.UpdatedAt);
    }
}

public sealed record AttendanceRosterResponse(
    AttendanceRosterTraining Training,
    IReadOnlyCollection<AttendanceRosterItem> Athletes);

public sealed record AttendanceRosterTraining(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    IReadOnlyCollection<TrainingGroupSummary> Groups,
    DateTimeOffset? StartedAt,
    Guid? StartedByUserId,
    DateTimeOffset? CompletedAt,
    Guid? CompletedByUserId);

public sealed record AttendanceRosterItem(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    string ParentFullName,
    string ParentPhone,
    AttendanceStatus? Status);

internal sealed record AttendanceRosterRow(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    string ParentFullName,
    string ParentPhone,
    AttendanceStatus? Status);
