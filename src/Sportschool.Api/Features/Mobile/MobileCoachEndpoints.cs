using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Mobile;

public static class MobileCoachEndpoints
{
    public static RouteGroupBuilder MapMobileCoachEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/coach")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Coach.ToString()));

        group.MapGet("/summary", GetSummaryAsync);
        group.MapGet("/groups", ListGroupsAsync);
        group.MapGet("/athletes", ListAthletesAsync);
        group.MapGet("/athletes/{athleteProfileId:guid}", GetAthleteAsync);
        group.MapPost("/athletes/{athleteProfileId:guid}/reports", CreateAthleteReportAsync);
        group.MapGet("/trainings", ListTrainingsAsync);
        group.MapGet("/trainings/{trainingId:guid}/attendance-roster", GetAttendanceRosterAsync);
        group.MapPost("/trainings/{trainingId:guid}/attendance", SaveAttendanceAsync);
        group.MapPut("/trainings/{trainingId:guid}/attendance/{athleteProfileId:guid}", UpdateAttendanceAsync);

        return group;
    }

    private static async Task<IResult> GetSummaryAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var now = DateTimeOffset.UtcNow;
        var todayStart = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var todayEnd = todayStart.AddDays(1);
        var weekEnd = todayStart.AddDays(7);

        var trainingRows = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.CoachId == context.CoachId && x.IsActive)
            .Select(x => new MobileCoachTrainingItem(
                x.Id,
                x.Title,
                x.StartsAt,
                x.EndsAt,
                x.GroupId,
                x.Group.Name,
                x.Location,
                x.Group.Athletes.Count(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive),
                db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id)))
            .ToListAsync(cancellationToken);

        var upcomingTrainings = trainingRows
            .Where(x => x.StartsAt >= todayStart && x.StartsAt < weekEnd)
            .OrderBy(x => x.StartsAt)
            .ToList();

        var groupIds = trainingRows.Select(x => x.GroupId).Distinct().ToArray();
        var athleteCount = await db.GroupAthletes
            .AsNoTracking()
            .Where(x => groupIds.Contains(x.GroupId)
                && x.AthleteProfile.SchoolId == context.SchoolId
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive)
            .Select(x => x.AthleteProfileId)
            .Distinct()
            .CountAsync(cancellationToken);

        return Results.Ok(new MobileCoachSummaryResponse(
            upcomingTrainings.Where(x => x.StartsAt >= todayStart && x.StartsAt < todayEnd).ToArray(),
            upcomingTrainings.Count,
            upcomingTrainings.Count(x => x.TotalAthletes > x.RecordedAttendanceCount),
            groupIds.Length,
            athleteCount));
    }

    private static async Task<IResult> ListGroupsAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var groups = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.CoachId == context.CoachId && x.IsActive && x.Group.IsActive)
            .Select(x => new MobileCoachGroupResponse(
                x.GroupId,
                x.Group.Name,
                x.Group.Description,
                x.Group.Athletes.Count(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)))
            .Distinct()
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return Results.Ok(groups);
    }

    private static async Task<IResult> ListAthletesAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var coachGroupIds = CoachGroupIds(context, db);
        var athleteRows = await db.GroupAthletes
            .AsNoTracking()
            .Where(x => coachGroupIds.Contains(x.GroupId)
                && x.AthleteProfile.SchoolId == context.SchoolId
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive)
            .Select(x => new
            {
                x.AthleteProfileId,
                x.AthleteProfile.FirstName,
                x.AthleteProfile.LastName,
                x.AthleteProfile.BirthDate,
                x.AthleteProfile.ParentFullName,
                x.AthleteProfile.ParentPhone,
                GroupName = x.Group.Name
            })
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ToListAsync(cancellationToken);

        var athleteIds = athleteRows.Select(x => x.AthleteProfileId).Distinct().ToArray();
        var reportScores = await db.AthleteReports
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && athleteIds.Contains(x.AthleteProfileId))
            .Select(x => new
            {
                x.AthleteProfileId,
                x.CreatedAt,
                AverageScore = (x.SpeedScore + x.StrengthScore + x.DribblingScore + x.ShootingScore) / 4
            })
            .ToListAsync(cancellationToken);

        var latestScores = reportScores
            .GroupBy(x => x.AthleteProfileId)
            .ToDictionary(
                x => x.Key,
                x => (decimal?)x.OrderByDescending(report => report.CreatedAt).First().AverageScore);

        var athletes = athleteRows
            .GroupBy(x => new
            {
                x.AthleteProfileId,
                x.FirstName,
                x.LastName,
                x.BirthDate,
                x.ParentFullName,
                x.ParentPhone
            })
            .Select(x => new MobileCoachAthleteListItem(
                x.Key.AthleteProfileId,
                x.Key.FirstName,
                x.Key.LastName,
                x.Key.BirthDate,
                x.Key.ParentFullName,
                x.Key.ParentPhone,
                x.Select(row => row.GroupName).OrderBy(name => name).ToArray(),
                latestScores.GetValueOrDefault(x.Key.AthleteProfileId)))
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ToArray();

        return Results.Ok(athletes);
    }

    private static async Task<IResult> GetAthleteAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        if (!await CoachCanAccessAthleteAsync(athleteProfileId, context, db, cancellationToken))
        {
            return Results.NotFound();
        }

        var athlete = await db.AthleteProfiles
            .AsNoTracking()
            .Where(x => x.Id == athleteProfileId && x.SchoolId == context.SchoolId && x.IsActive && x.User.IsActive)
            .Select(x => new
            {
                x.Id,
                x.FirstName,
                x.LastName,
                x.BirthDate,
                x.ParentFullName,
                x.ParentPhone
            })
            .FirstAsync(cancellationToken);

        var coachGroupIds = CoachGroupIds(context, db);
        var groups = await db.GroupAthletes
            .AsNoTracking()
            .Where(x => x.AthleteProfileId == athleteProfileId && coachGroupIds.Contains(x.GroupId))
            .OrderBy(x => x.Group.Name)
            .Select(x => x.Group.Name)
            .ToArrayAsync(cancellationToken);

        var reportRows = await db.AthleteReports
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.AthleteProfileId == athleteProfileId)
            .Select(x => AthleteReportResponse.From(x))
            .ToArrayAsync(cancellationToken);
        var reports = reportRows
            .OrderByDescending(x => x.CreatedAt)
            .ToArray();

        return Results.Ok(new MobileCoachAthleteDetailResponse(
            athlete.Id,
            athlete.FirstName,
            athlete.LastName,
            athlete.BirthDate,
            athlete.ParentFullName,
            athlete.ParentPhone,
            groups,
            reports));
    }

    private static async Task<IResult> CreateAthleteReportAsync(
        Guid athleteProfileId,
        SaveMobileCoachAthleteReportRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        if (request.AthleteProfileId != athleteProfileId || !IsValidReportRequest(request))
        {
            return Results.BadRequest();
        }

        if (!await CoachCanAccessAthleteAsync(athleteProfileId, context, db, cancellationToken))
        {
            return Results.NotFound();
        }

        var report = new AthleteReport
        {
            SchoolId = context.SchoolId,
            AthleteProfileId = athleteProfileId,
            CoachId = context.CoachId,
            Summary = request.Summary.Trim(),
            ImprovementAreas = request.ImprovementAreas.Trim(),
            SpeedScore = request.SpeedScore,
            StrengthScore = request.StrengthScore,
            DribblingScore = request.DribblingScore,
            ShootingScore = request.ShootingScore
        };

        db.AthleteReports.Add(report);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/mobile/coach/athletes/{athleteProfileId}/reports/{report.Id}",
            AthleteReportResponse.From(report));
    }

    private static async Task<IResult> ListTrainingsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var now = DateTimeOffset.UtcNow;
        var start = from ?? new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var end = to ?? start.AddDays(14);
        if (end <= start)
        {
            return Results.BadRequest();
        }

        var trainingRows = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId
                && x.CoachId == context.CoachId
                && x.IsActive
                && x.StartsAt >= start
                && x.StartsAt < end)
            .OrderBy(x => x.StartsAt)
            .Select(x => new MobileCoachTrainingItem(
                x.Id,
                x.Title,
                x.StartsAt,
                x.EndsAt,
                x.GroupId,
                x.Group.Name,
                x.Location,
                x.Group.Athletes.Count(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive),
                db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id)))
            .ToListAsync(cancellationToken);

        return Results.Ok(trainingRows);
    }

    private static async Task<IResult> GetAttendanceRosterAsync(
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

        var training = await FindCoachTrainingAsync(trainingId, context, db, cancellationToken);
        if (training is null)
        {
            return Results.NotFound();
        }

        var athletes = await db.GroupAthletes
            .AsNoTracking()
            .Where(x => x.GroupId == training.GroupId
                && x.AthleteProfile.SchoolId == context.SchoolId
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive)
            .OrderBy(x => x.AthleteProfile.LastName)
            .ThenBy(x => x.AthleteProfile.FirstName)
            .Select(x => new MobileCoachAttendanceRosterItem(
                x.AthleteProfileId,
                x.AthleteProfile.FirstName,
                x.AthleteProfile.LastName,
                x.AthleteProfile.ParentFullName,
                x.AthleteProfile.ParentPhone,
                db.AttendanceRecords
                    .Where(a => a.TrainingSessionId == trainingId && a.AthleteProfileId == x.AthleteProfileId)
                    .Select(a => (AttendanceStatus?)a.Status)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);

        return Results.Ok(new MobileCoachAttendanceRosterResponse(training, athletes));
    }

    private static async Task<IResult> SaveAttendanceAsync(
        Guid trainingId,
        SaveMobileCoachAttendanceRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        if (request.AthleteProfileId == Guid.Empty || !Enum.IsDefined(request.Status))
        {
            return Results.BadRequest();
        }

        var training = await FindCoachTrainingAsync(trainingId, context, db, cancellationToken);
        if (training is null)
        {
            return Results.NotFound();
        }

        var athleteIsInGroup = await db.GroupAthletes.AnyAsync(
            x => x.GroupId == training.GroupId
                && x.AthleteProfileId == request.AthleteProfileId
                && x.AthleteProfile.SchoolId == context.SchoolId
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
            SchoolId = context.SchoolId,
            TrainingSessionId = trainingId,
            AthleteProfileId = request.AthleteProfileId,
            Status = request.Status,
            RecordedByUserId = context.CoachId
        };

        db.AttendanceRecords.Add(attendance);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/mobile/coach/trainings/{trainingId}/attendance/{attendance.AthleteProfileId}",
            MobileCoachAttendanceResponse.From(attendance));
    }

    private static async Task<IResult> UpdateAttendanceAsync(
        Guid trainingId,
        Guid athleteProfileId,
        SaveMobileCoachAttendanceRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        if (request.AthleteProfileId != athleteProfileId || !Enum.IsDefined(request.Status))
        {
            return Results.BadRequest();
        }

        var training = await FindCoachTrainingAsync(trainingId, context, db, cancellationToken);
        if (training is null)
        {
            return Results.NotFound();
        }

        var attendance = await db.AttendanceRecords.FirstOrDefaultAsync(
            x => x.TrainingSessionId == trainingId
                && x.AthleteProfileId == athleteProfileId
                && x.SchoolId == context.SchoolId,
            cancellationToken);
        if (attendance is null)
        {
            return Results.NotFound();
        }

        attendance.Status = request.Status;
        attendance.UpdatedByUserId = context.CoachId;
        attendance.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(MobileCoachAttendanceResponse.From(attendance));
    }

    private static CoachContext? GetCoachContext(ClaimsPrincipal currentUser)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var coachId = CurrentUser.GetUserId(currentUser);
        return schoolId is null || coachId is null ? null : new CoachContext(schoolId.Value, coachId.Value);
    }

    private static Task<MobileCoachAttendanceRosterTraining?> FindCoachTrainingAsync(
        Guid trainingId,
        CoachContext context,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        return db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.Id == trainingId
                && x.SchoolId == context.SchoolId
                && x.CoachId == context.CoachId
                && x.IsActive)
            .Select(x => new MobileCoachAttendanceRosterTraining(
                x.Id,
                x.Title,
                x.StartsAt,
                x.EndsAt,
                x.GroupId,
                x.Group.Name,
                x.Location))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static IQueryable<Guid> CoachGroupIds(CoachContext context, SportschoolDbContext db)
    {
        return db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.CoachId == context.CoachId && x.IsActive && x.Group.IsActive)
            .Select(x => x.GroupId)
            .Distinct();
    }

    private static Task<bool> CoachCanAccessAthleteAsync(
        Guid athleteProfileId,
        CoachContext context,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var coachGroupIds = CoachGroupIds(context, db);
        return db.GroupAthletes.AnyAsync(
            x => x.AthleteProfileId == athleteProfileId
                && coachGroupIds.Contains(x.GroupId)
                && x.AthleteProfile.SchoolId == context.SchoolId
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive,
            cancellationToken);
    }

    private static bool IsValidReportRequest(SaveMobileCoachAthleteReportRequest request)
    {
        return request.AthleteProfileId != Guid.Empty
            && !string.IsNullOrWhiteSpace(request.Summary)
            && !string.IsNullOrWhiteSpace(request.ImprovementAreas)
            && ReportScoreValidator.IsValid(request.SpeedScore)
            && ReportScoreValidator.IsValid(request.StrengthScore)
            && ReportScoreValidator.IsValid(request.DribblingScore)
            && ReportScoreValidator.IsValid(request.ShootingScore);
    }

    private sealed record CoachContext(Guid SchoolId, Guid CoachId);
}

public sealed record MobileCoachSummaryResponse(
    IReadOnlyCollection<MobileCoachTrainingItem> TodayTrainings,
    int WeekTrainingCount,
    int MissingAttendanceCount,
    int GroupCount,
    int AthleteCount);

public sealed record MobileCoachGroupResponse(
    Guid Id,
    string Name,
    string? Description,
    int AthleteCount);

public sealed record MobileCoachAthleteListItem(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    string ParentFullName,
    string ParentPhone,
    IReadOnlyCollection<string> Groups,
    decimal? LatestAverageScore);

public sealed record MobileCoachAthleteDetailResponse(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    string ParentFullName,
    string ParentPhone,
    IReadOnlyCollection<string> Groups,
    IReadOnlyCollection<AthleteReportResponse> Reports);

public sealed record MobileCoachTrainingItem(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    Guid GroupId,
    string GroupName,
    string? Location,
    int TotalAthletes,
    int RecordedAttendanceCount);

public sealed record MobileCoachAttendanceRosterResponse(
    MobileCoachAttendanceRosterTraining Training,
    IReadOnlyCollection<MobileCoachAttendanceRosterItem> Athletes);

public sealed record MobileCoachAttendanceRosterTraining(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    Guid GroupId,
    string GroupName,
    string? Location);

public sealed record MobileCoachAttendanceRosterItem(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    string ParentFullName,
    string ParentPhone,
    AttendanceStatus? Status);

public sealed record SaveMobileCoachAttendanceRequest(Guid AthleteProfileId, AttendanceStatus Status);

public sealed record SaveMobileCoachAthleteReportRequest(
    Guid AthleteProfileId,
    string Summary,
    string ImprovementAreas,
    decimal SpeedScore,
    decimal StrengthScore,
    decimal DribblingScore,
    decimal ShootingScore);

public sealed record MobileCoachAttendanceResponse(
    Guid Id,
    Guid TrainingSessionId,
    Guid AthleteProfileId,
    AttendanceStatus Status,
    Guid RecordedByUserId,
    Guid? UpdatedByUserId,
    DateTimeOffset RecordedAt,
    DateTimeOffset? UpdatedAt)
{
    public static MobileCoachAttendanceResponse From(AttendanceRecord attendance)
    {
        return new MobileCoachAttendanceResponse(
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
