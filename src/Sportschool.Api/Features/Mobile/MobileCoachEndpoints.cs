using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
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
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var todayStart = LocalDayRange.StartOfToday(timeZone);
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
                x.Groups
                    .OrderBy(group => group.Group.Name)
                    .Select(group => new TrainingGroupSummary(group.GroupId, group.Group.Name))
                    .ToArray(),
                x.Location,
                x.Groups
                    .SelectMany(group => group.Group.Athletes)
                    .Where(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)
                    .Select(a => a.AthleteProfileId)
                    .Distinct()
                    .Count(),
                db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id),
                x.Notes))
            .ToListAsync(cancellationToken);

        var upcomingTrainings = trainingRows
            .Where(x => x.StartsAt >= todayStart && x.StartsAt < weekEnd)
            .OrderBy(x => x.StartsAt)
            .ToList();

        var schoolGroupIds = await SchoolGroupIds(context, db).ToArrayAsync(cancellationToken);
        var athleteCount = await db.AthleteProfiles
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.IsActive && x.User.IsActive)
            .CountAsync(cancellationToken);

        return Results.Ok(new MobileCoachSummaryResponse(
            upcomingTrainings.Where(x => x.StartsAt >= todayStart && x.StartsAt < todayEnd).ToArray(),
            upcomingTrainings.Count,
            upcomingTrainings.Count(x => x.TotalAthletes > x.RecordedAttendanceCount),
            schoolGroupIds.Length,
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

        var groups = await db.TrainingGroups
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.IsActive)
            .Select(x => new MobileCoachGroupResponse(
                x.Id,
                x.Name,
                x.Description,
                x.Athletes.Count(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)))
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

        var athleteRows = await db.AthleteProfiles
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.IsActive && x.User.IsActive)
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .Select(x => new
            {
                AthleteProfileId = x.Id,
                x.FirstName,
                x.LastName,
                x.BirthDate,
                x.ParentFullName,
                x.ParentPhone,
                GroupNames = db.GroupAthletes
                    .Where(membership => membership.AthleteProfileId == x.Id
                        && membership.Group.SchoolId == context.SchoolId
                        && membership.Group.IsActive)
                    .OrderBy(membership => membership.Group.Name)
                    .Select(membership => membership.Group.Name)
                    .ToArray()
            })
            .ToListAsync(cancellationToken);

        var athleteIds = athleteRows.Select(x => x.AthleteProfileId).ToArray();
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
            .Select(x => new MobileCoachAthleteListItem(
                x.AthleteProfileId,
                x.FirstName,
                x.LastName,
                x.BirthDate,
                x.ParentFullName,
                x.ParentPhone,
                x.GroupNames,
                latestScores.GetValueOrDefault(x.AthleteProfileId)))
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

        var coachGroupIds = SchoolGroupIds(context, db);
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
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var start = from ?? LocalDayRange.StartOfToday(timeZone);
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
                x.Groups
                    .OrderBy(group => group.Group.Name)
                    .Select(group => new TrainingGroupSummary(group.GroupId, group.Group.Name))
                    .ToArray(),
                x.Location,
                x.Groups
                    .SelectMany(group => group.Group.Athletes)
                    .Where(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)
                    .Select(a => a.AthleteProfileId)
                    .Distinct()
                    .Count(),
                db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id),
                x.Notes))
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

        var groupIds = training.Groups.Select(x => x.Id).ToArray();
        var athleteRows = await db.GroupAthletes
            .AsNoTracking()
            .Where(x => groupIds.Contains(x.GroupId)
                && x.AthleteProfile.SchoolId == context.SchoolId
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive)
            .Select(x => new
            {
                x.AthleteProfileId,
                x.AthleteProfile.FirstName,
                x.AthleteProfile.LastName,
                x.AthleteProfile.ParentFullName,
                x.AthleteProfile.ParentPhone,
                Status = db.AttendanceRecords
                    .Where(a => a.TrainingSessionId == trainingId && a.AthleteProfileId == x.AthleteProfileId)
                    .Select(a => (AttendanceStatus?)a.Status)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);
        var athletes = athleteRows
            .GroupBy(x => new
            {
                x.AthleteProfileId,
                x.FirstName,
                x.LastName,
                x.ParentFullName,
                x.ParentPhone,
                x.Status
            })
            .Select(x => new MobileCoachAttendanceRosterItem(
                x.Key.AthleteProfileId,
                x.Key.FirstName,
                x.Key.LastName,
                x.Key.ParentFullName,
                x.Key.ParentPhone,
                x.Key.Status))
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ToArray();

        return Results.Ok(new MobileCoachAttendanceRosterResponse(training, athletes));
    }

    private static async Task<IResult> SaveAttendanceAsync(
        Guid trainingId,
        SaveMobileCoachAttendanceRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        TimeZoneInfo timeZone,
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

        if (!IsWithinAttendanceWindow(training.StartsAt, timeZone))
        {
            return AttendanceWindowClosed();
        }

        var groupIds = training.Groups.Select(group => group.Id).ToArray();
        var athleteIsInGroup = await db.GroupAthletes.AnyAsync(
            x => groupIds.Contains(x.GroupId)
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
        TimeZoneInfo timeZone,
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

        if (!IsWithinAttendanceWindow(training.StartsAt, timeZone))
        {
            return AttendanceWindowClosed();
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

    /// <summary>
    /// Attendance may be taken once a training has started and until the end of the day
    /// (in the configured time zone) on which it started. Future trainings and trainings
    /// from earlier days are outside the window.
    /// </summary>
    private static bool IsWithinAttendanceWindow(DateTimeOffset startsAt, TimeZoneInfo timeZone)
    {
        var now = DateTimeOffset.UtcNow;
        var todayStart = LocalDayRange.StartOfToday(timeZone, now);
        return startsAt >= todayStart && startsAt <= now;
    }

    private static IResult AttendanceWindowClosed()
    {
        return Results.Problem(
            statusCode: 422,
            title: "Yoklama penceresi kapalı",
            detail: "Bu antrenman için yoklama alma süresi geçerli değil.");
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
                x.Groups
                    .OrderBy(group => group.Group.Name)
                    .Select(group => new TrainingGroupSummary(group.GroupId, group.Group.Name))
                    .ToArray(),
                x.Location,
                x.Notes))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static IQueryable<Guid> SchoolGroupIds(CoachContext context, SportschoolDbContext db)
    {
        return db.TrainingGroups
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && x.IsActive)
            .Select(x => x.Id);
    }

    private static Task<bool> CoachCanAccessAthleteAsync(
        Guid athleteProfileId,
        CoachContext context,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        return db.AthleteProfiles.AnyAsync(
            x => x.Id == athleteProfileId
                && x.SchoolId == context.SchoolId
                && x.IsActive
                && x.User.IsActive,
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
    IReadOnlyCollection<TrainingGroupSummary> Groups,
    string? Location,
    int TotalAthletes,
    int RecordedAttendanceCount,
    string? Notes);

public sealed record MobileCoachAttendanceRosterResponse(
    MobileCoachAttendanceRosterTraining Training,
    IReadOnlyCollection<MobileCoachAttendanceRosterItem> Athletes);

public sealed record MobileCoachAttendanceRosterTraining(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    IReadOnlyCollection<TrainingGroupSummary> Groups,
    string? Location,
    string? Notes);

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
