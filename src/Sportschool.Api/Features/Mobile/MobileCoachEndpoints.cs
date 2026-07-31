using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Media;
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
        group.MapPut("/trainings/{trainingId:guid}/attendance", SaveAttendanceBatchAsync);

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
                x.StartedAt != null
                    ? db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id)
                    : x.Groups
                        .SelectMany(group => group.Group.Athletes)
                        .Where(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)
                        .Select(a => a.AthleteProfileId)
                        .Distinct()
                        .Count(),
                x.StartedAt,
                x.StartedByUserId,
                x.CompletedAt,
                x.CompletedByUserId,
                db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id && a.Status != null),
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
        MediaAccessUrlService mediaUrls,
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
                x.ProfileImageStorageKey,
                x.ProfileImageVersion,
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
        var reportScores = await db.TrainingAthleteReports
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId && athleteIds.Contains(x.AthleteProfileId))
            .Select(x => new
            {
                x.AthleteProfileId,
                x.CreatedAt,
                x.NutritionScore,
                x.CognitiveDevelopmentScore,
                x.DisciplineScore,
                x.PhysicalConditionScore,
                x.PsychologicalDevelopmentScore,
                x.TacticalDevelopmentScore,
                x.TechnicalDevelopmentScore
            })
            .ToListAsync(cancellationToken);

        var latestScores = reportScores
            .GroupBy(x => x.AthleteProfileId)
            .ToDictionary(
                x => x.Key,
                x =>
                {
                    var latest = x.OrderByDescending(report => report.CreatedAt).First();
                    return (decimal?)Math.Round((latest.NutritionScore
                        + latest.CognitiveDevelopmentScore
                        + latest.DisciplineScore
                        + latest.PhysicalConditionScore
                        + latest.PsychologicalDevelopmentScore
                        + latest.TacticalDevelopmentScore
                        + latest.TechnicalDevelopmentScore) / 7, 2);
                });

        var athletes = athleteRows
            .Select(x => new MobileCoachAthleteListItem(
                x.AthleteProfileId,
                x.FirstName,
                x.LastName,
                x.BirthDate,
                x.ParentFullName,
                x.ParentPhone,
                x.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(context.SchoolId, x.AthleteProfileId, x.ProfileImageVersion),
                x.GroupNames,
                latestScores.GetValueOrDefault(x.AthleteProfileId)))
            .ToArray();

        return Results.Ok(athletes);
    }

    private static async Task<IResult> GetAthleteAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
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
                x.ParentPhone,
                x.ProfileImageStorageKey,
                x.ProfileImageVersion
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

        var trainingReports = await db.TrainingAthleteReports
            .AsNoTracking()
            .Include(x => x.TrainingSession)
            .Include(x => x.Coach)
            .Where(x => x.SchoolId == context.SchoolId && x.AthleteProfileId == athleteProfileId)
            .ToListAsync(cancellationToken);
        var orderedTrainingReports = trainingReports
            .Where(x => x.TrainingSession.CompletedAt is not null)
            .OrderByDescending(x => x.TrainingSession.CompletedAt)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => TrainingReportResponse.From(
                x,
                x.TrainingSession.Title,
                x.TrainingSession.CompletedAt!.Value,
                x.Coach.FullName))
            .ToArray();

        return Results.Ok(new MobileCoachAthleteDetailResponse(
            athlete.Id,
            athlete.FirstName,
            athlete.LastName,
            athlete.BirthDate,
            athlete.ParentFullName,
            athlete.ParentPhone,
            athlete.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(context.SchoolId, athlete.Id, athlete.ProfileImageVersion),
            groups,
            reports,
            orderedTrainingReports));
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

        var start = (from ?? LocalDayRange.StartOfToday(timeZone)).ToUniversalTime();
        var end = (to ?? start.AddDays(14)).ToUniversalTime();
        if (end <= start)
        {
            return Results.BadRequest();
        }

        var trainingRows = await db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == context.SchoolId
                && x.CoachId == context.CoachId
                && x.IsActive)
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
                x.StartedAt != null
                    ? db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id)
                    : x.Groups
                        .SelectMany(group => group.Group.Athletes)
                        .Where(a => a.AthleteProfile.IsActive && a.AthleteProfile.User.IsActive)
                        .Select(a => a.AthleteProfileId)
                        .Distinct()
                        .Count(),
                x.StartedAt,
                x.StartedByUserId,
                x.CompletedAt,
                x.CompletedByUserId,
                db.AttendanceRecords.Count(a => a.TrainingSessionId == x.Id && a.Status != null),
                x.Notes))
            .ToListAsync(cancellationToken);

        var trainings = trainingRows
            .Where(x => x.StartsAt >= start && x.StartsAt < end)
            .OrderBy(x => x.StartsAt)
            .ToList();

        return Results.Ok(trainings);
    }

    private static async Task<IResult> GetAttendanceRosterAsync(
        Guid trainingId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
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

        var athleteRows = training.StartedAt is not null
            ? await db.AttendanceRecords
                .AsNoTracking()
                .Where(x => x.TrainingSessionId == trainingId)
                .Select(x => new AttendanceRosterRow(
                    x.AthleteProfileId,
                    x.AthleteProfile.FirstName,
                    x.AthleteProfile.LastName,
                    x.AthleteProfile.ParentFullName,
                    x.AthleteProfile.ParentPhone,
                    x.AthleteProfile.ProfileImageStorageKey,
                    x.AthleteProfile.ProfileImageVersion,
                    x.Status,
                    db.TrainingAthleteReports.Any(report => report.TrainingSessionId == trainingId && report.AthleteProfileId == x.AthleteProfileId)))
                .ToListAsync(cancellationToken)
            : await db.GroupAthletes
                .AsNoTracking()
                .Where(x => training.Groups.Select(group => group.Id).Contains(x.GroupId)
                    && x.AthleteProfile.SchoolId == context.SchoolId
                    && x.AthleteProfile.IsActive
                    && x.AthleteProfile.User.IsActive)
                .Select(x => new AttendanceRosterRow(
                    x.AthleteProfileId,
                    x.AthleteProfile.FirstName,
                    x.AthleteProfile.LastName,
                    x.AthleteProfile.ParentFullName,
                    x.AthleteProfile.ParentPhone,
                    x.AthleteProfile.ProfileImageStorageKey,
                    x.AthleteProfile.ProfileImageVersion,
                    null,
                    false))
                .ToListAsync(cancellationToken);
        var athletes = athleteRows
            .GroupBy(x => x.AthleteProfileId)
            .Select(x => x.First())
            .Select(x => new MobileCoachAttendanceRosterItem(
                x.AthleteProfileId,
                x.FirstName,
                x.LastName,
                x.ParentFullName,
                x.ParentPhone,
                x.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(context.SchoolId, x.AthleteProfileId, x.ProfileImageVersion),
                x.Status,
                x.ReportEntered))
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

        if (training.StartedAt is null || training.CompletedAt is not null)
        {
            return AttendanceLocked();
        }

        var attendance = await db.AttendanceRecords.FirstOrDefaultAsync(
            x => x.TrainingSessionId == trainingId
                && x.AthleteProfileId == request.AthleteProfileId
                && x.SchoolId == context.SchoolId,
            cancellationToken);
        if (attendance is null)
        {
            return Results.NotFound();
        }

        if (attendance.Status is not null)
        {
            return Results.Conflict();
        }

        attendance.Status = request.Status;
        attendance.RecordedByUserId = context.CoachId;
        attendance.RecordedAt = DateTimeOffset.UtcNow;
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

        if (training.StartedAt is null || training.CompletedAt is not null)
        {
            return AttendanceLocked();
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
        attendance.RecordedByUserId ??= context.CoachId;
        attendance.RecordedAt ??= DateTimeOffset.UtcNow;
        attendance.UpdatedByUserId = context.CoachId;
        attendance.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(MobileCoachAttendanceResponse.From(attendance));
    }

    private static async Task<IResult> SaveAttendanceBatchAsync(
        Guid trainingId,
        SaveMobileCoachAttendanceBatchRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        if (request.Items.Count == 0
            || request.Items.Any(item => item.AthleteProfileId == Guid.Empty || !Enum.IsDefined(item.Status))
            || request.Items.Select(item => item.AthleteProfileId).Distinct().Count() != request.Items.Count)
        {
            return Results.BadRequest();
        }

        var training = await FindCoachTrainingAsync(trainingId, context, db, cancellationToken);
        if (training is null)
        {
            return Results.NotFound();
        }

        if (training.StartedAt is null || training.CompletedAt is not null)
        {
            return AttendanceLocked();
        }

        var athleteIds = request.Items.Select(item => item.AthleteProfileId).Distinct().ToArray();
        var attendanceRows = await db.AttendanceRecords
            .Where(x => x.TrainingSessionId == trainingId && athleteIds.Contains(x.AthleteProfileId))
            .ToListAsync(cancellationToken);
        if (attendanceRows.Count != athleteIds.Length)
        {
            return Results.NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        var statuses = request.Items.ToDictionary(item => item.AthleteProfileId, item => item.Status);
        foreach (var attendance in attendanceRows)
        {
            attendance.Status = statuses[attendance.AthleteProfileId];
            attendance.RecordedByUserId ??= context.CoachId;
            attendance.RecordedAt ??= now;
            attendance.UpdatedByUserId = context.CoachId;
            attendance.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static CoachContext? GetCoachContext(ClaimsPrincipal currentUser)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var coachId = CurrentUser.GetUserId(currentUser);
        return schoolId is null || coachId is null ? null : new CoachContext(schoolId.Value, coachId.Value);
    }

    private static IResult AttendanceLocked()
    {
        return Results.Problem(
            statusCode: 409,
            title: "Yoklama kilitli",
            detail: "Yoklama yalnızca başlatılmış ve tamamlanmamış antrenmanda değiştirilebilir.");
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
                x.Notes,
                x.StartedAt,
                x.StartedByUserId,
                x.CompletedAt,
                x.CompletedByUserId))
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
    string? ProfileImageUrl,
    IReadOnlyCollection<string> Groups,
    decimal? LatestAverageScore);

public sealed record MobileCoachAthleteDetailResponse(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    string ParentFullName,
    string ParentPhone,
    string? ProfileImageUrl,
    IReadOnlyCollection<string> Groups,
    IReadOnlyCollection<AthleteReportResponse> Reports,
    IReadOnlyCollection<TrainingReportResponse> TrainingReports);

public sealed record MobileCoachTrainingItem(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    IReadOnlyCollection<TrainingGroupSummary> Groups,
    string? Location,
    int TotalAthletes,
    DateTimeOffset? StartedAt,
    Guid? StartedByUserId,
    DateTimeOffset? CompletedAt,
    Guid? CompletedByUserId,
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
    string? Notes,
    DateTimeOffset? StartedAt,
    Guid? StartedByUserId,
    DateTimeOffset? CompletedAt,
    Guid? CompletedByUserId);

public sealed record MobileCoachAttendanceRosterItem(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    string ParentFullName,
    string ParentPhone,
    string? ProfileImageUrl,
    AttendanceStatus? Status,
    bool ReportEntered);

public sealed record SaveMobileCoachAttendanceRequest(Guid AthleteProfileId, AttendanceStatus Status);

public sealed record SaveMobileCoachAttendanceBatchRequest(IReadOnlyCollection<SaveMobileCoachAttendanceRequest> Items);

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
    AttendanceStatus? Status,
    Guid? RecordedByUserId,
    Guid? UpdatedByUserId,
    DateTimeOffset? RecordedAt,
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

internal sealed record AttendanceRosterRow(
    Guid AthleteProfileId,
    string FirstName,
    string LastName,
    string ParentFullName,
    string ParentPhone,
    string? ProfileImageStorageKey,
    Guid? ProfileImageVersion,
    AttendanceStatus? Status,
    bool ReportEntered);
