using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
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

        var adminGroup = app.MapGroup("/api/school/trainings/{trainingId:guid}/attendance")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        adminGroup.MapPut("/{athleteProfileId:guid}", UpdateAttendanceAsync);

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

        var training = await db.TrainingSessions.FirstOrDefaultAsync(
            x => x.Id == trainingId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (training is null)
        {
            return Results.NotFound();
        }

        var athleteIsInGroup = await db.GroupAthletes.AnyAsync(
            x => x.GroupId == training.GroupId
                && x.AthleteProfileId == request.AthleteProfileId
                && x.AthleteProfile.SchoolId == schoolId.Value
                && x.AthleteProfile.IsActive,
            cancellationToken);

        if (!athleteIsInGroup)
        {
            return Results.NotFound();
        }

        var exists = await db.AttendanceRecords.AnyAsync(
            x => x.TrainingSessionId == trainingId && x.AthleteProfileId == request.AthleteProfileId,
            cancellationToken);

        if (exists)
        {
            return Results.Conflict();
        }

        var attendance = new AttendanceRecord
        {
            SchoolId = schoolId.Value,
            TrainingSessionId = trainingId,
            AthleteProfileId = request.AthleteProfileId,
            Status = request.Status,
            RecordedByUserId = userId.Value
        };

        db.AttendanceRecords.Add(attendance);
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

        attendance.Status = request.Status;
        attendance.UpdatedByUserId = userId.Value;
        attendance.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AttendanceResponse.From(attendance));
    }
}

public sealed record SaveAttendanceRequest(Guid AthleteProfileId, AttendanceStatus Status);

public sealed record AttendanceResponse(
    Guid Id,
    Guid TrainingSessionId,
    Guid AthleteProfileId,
    AttendanceStatus Status,
    Guid RecordedByUserId,
    Guid? UpdatedByUserId,
    DateTimeOffset RecordedAt,
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
