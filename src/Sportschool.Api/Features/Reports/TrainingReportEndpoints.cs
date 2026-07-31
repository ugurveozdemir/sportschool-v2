using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Reports;

public static class TrainingReportEndpoints
{
    public static IEndpointRouteBuilder MapTrainingReportEndpoints(this IEndpointRouteBuilder app)
    {
        var coachGroup = app.MapGroup("/api/mobile/coach")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Coach.ToString()));

        coachGroup.MapPut(
            "/trainings/{trainingId:guid}/athletes/{athleteProfileId:guid}/report",
            SaveTrainingReportAsync);
        coachGroup.MapGet("/training-reports", ListCoachTrainingReportsAsync);
        coachGroup.MapGet("/training-reports/{trainingId:guid}", GetCoachTrainingReportAsync);

        var memberGroup = app.MapGroup("/api/me")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Parent.ToString(), UserRole.Athlete.ToString()));

        memberGroup.MapGet("/development-summary", GetDevelopmentSummaryAsync);

        return app;
    }

    private static async Task<IResult> SaveTrainingReportAsync(
        Guid trainingId,
        Guid athleteProfileId,
        SaveTrainingReportRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        if (request.AthleteProfileId != athleteProfileId || !IsValidRequest(request))
        {
            return Results.BadRequest();
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

        if (training.CompletedAt is null)
        {
            return Results.Conflict(new { detail = "Rapor yalnızca tamamlanmış antrenman için girilebilir." });
        }

        var attended = await db.AttendanceRecords.AnyAsync(
            x => x.TrainingSessionId == trainingId
                && x.AthleteProfileId == athleteProfileId
                && x.SchoolId == context.Value.SchoolId
                && x.Status == AttendanceStatus.Present,
            cancellationToken);
        if (!attended)
        {
            return Results.Conflict(new { detail = "Gelmedi olarak işaretlenen oyuncu için rapor girilemez." });
        }

        var report = await db.TrainingAthleteReports.FirstOrDefaultAsync(
            x => x.TrainingSessionId == trainingId && x.AthleteProfileId == athleteProfileId,
            cancellationToken);

        if (report is null)
        {
            report = new TrainingAthleteReport
            {
                SchoolId = context.Value.SchoolId,
                TrainingSessionId = trainingId,
                AthleteProfileId = athleteProfileId,
                CoachId = context.Value.CoachId
            };
            db.TrainingAthleteReports.Add(report);
        }

        report.NutritionScore = request.NutritionScore;
        report.CognitiveDevelopmentScore = request.CognitiveDevelopmentScore;
        report.DisciplineScore = request.DisciplineScore;
        report.PhysicalConditionScore = request.PhysicalConditionScore;
        report.PsychologicalDevelopmentScore = request.PsychologicalDevelopmentScore;
        report.TacticalDevelopmentScore = request.TacticalDevelopmentScore;
        report.TechnicalDevelopmentScore = request.TechnicalDevelopmentScore;
        report.CoachNote = string.IsNullOrWhiteSpace(request.CoachNote) ? null : request.CoachNote.Trim();
        report.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        var coachName = await db.Users
            .Where(x => x.Id == context.Value.CoachId)
            .Select(x => x.FullName)
            .SingleAsync(cancellationToken);

        return Results.Ok(TrainingReportResponse.From(report, training.Title, training.CompletedAt.Value, coachName));
    }

    private static async Task<IResult> GetDevelopmentSummaryAsync(
        Guid? athleteProfileId,
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

        var profileQuery = db.AthleteProfiles.Where(x => x.SchoolId == schoolId.Value
            && (x.UserId == userId.Value || x.ParentUserId == userId.Value)
            && x.IsActive);
        if (athleteProfileId is not null)
        {
            profileQuery = profileQuery.Where(x => x.Id == athleteProfileId.Value);
        }

        var profile = await profileQuery
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => new { x.Id, x.FirstName, x.LastName })
            .FirstOrDefaultAsync(cancellationToken);
        if (profile is null)
        {
            return Results.NotFound();
        }

        var reports = await db.TrainingAthleteReports
            .AsNoTracking()
            .Include(x => x.TrainingSession)
            .Include(x => x.Coach)
            .Where(x => x.SchoolId == schoolId.Value && x.AthleteProfileId == profile.Id)
            .ToListAsync(cancellationToken);
        reports = reports
            .OrderByDescending(x => x.TrainingSession.CompletedAt)
            .ThenByDescending(x => x.CreatedAt)
            .Take(8)
            .ToList();

        var attendance = await db.AttendanceRecords
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value
                && x.AthleteProfileId == profile.Id
                && x.Status != null)
            .Select(x => x.Status!.Value)
            .ToListAsync(cancellationToken);

        var averages = reports.Count == 0
            ? null
            : (DevelopmentMetricAverages?)new DevelopmentMetricAverages(
                Average(reports, x => x.NutritionScore),
                Average(reports, x => x.CognitiveDevelopmentScore),
                Average(reports, x => x.DisciplineScore),
                Average(reports, x => x.PhysicalConditionScore),
                Average(reports, x => x.PsychologicalDevelopmentScore),
                Average(reports, x => x.TacticalDevelopmentScore),
                Average(reports, x => x.TechnicalDevelopmentScore));

        var presentCount = attendance.Count(x => x == AttendanceStatus.Present);
        var attendanceRate = attendance.Count == 0
            ? (decimal?)null
            : Math.Round(presentCount * 100m / attendance.Count, 2);

        return Results.Ok(new DevelopmentSummaryResponse(
            profile.Id,
            profile.FirstName + " " + profile.LastName,
            reports.Count,
            attendance.Count,
            presentCount,
            attendanceRate,
            averages,
            reports.Select(x => TrainingReportResponse.From(x, x.TrainingSession.Title, x.TrainingSession.CompletedAt!.Value, x.Coach.FullName)).ToArray()));
    }

    private static async Task<IResult> ListCoachTrainingReportsAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var context = GetCoachContext(currentUser);
        if (context is null)
        {
            return Results.Forbid();
        }

        var reportRows = await db.TrainingAthleteReports
            .AsNoTracking()
            .Include(x => x.TrainingSession)
            .Include(x => x.Coach)
            .Where(x => x.SchoolId == context.Value.SchoolId
                && x.TrainingSession.CoachId == context.Value.CoachId
                && x.TrainingSession.CompletedAt != null)
            .ToListAsync(cancellationToken);

        var reports = reportRows
            .GroupBy(x => x.TrainingSessionId)
            .Select(group =>
            {
                var latest = group.OrderByDescending(x => x.CreatedAt).First();
                return new CoachTrainingReportListItem(
                    group.Key,
                    latest.TrainingSession.Title,
                    latest.TrainingSession.CompletedAt!.Value,
                    latest.Coach.FullName,
                    group.Count());
            })
            .OrderByDescending(x => x.TrainingCompletedAt)
            .ToArray();

        return Results.Ok(reports);
    }

    private static async Task<IResult> GetCoachTrainingReportAsync(
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
            .AsNoTracking()
            .Include(x => x.Coach)
            .FirstOrDefaultAsync(x => x.Id == trainingId
                && x.SchoolId == context.Value.SchoolId
                && x.CoachId == context.Value.CoachId
                && x.CompletedAt != null,
                cancellationToken);
        if (training is null)
        {
            return Results.NotFound();
        }
        var completedAt = training.CompletedAt!.Value;

        var reportRows = await db.TrainingAthleteReports
            .AsNoTracking()
            .Include(x => x.AthleteProfile)
            .Include(x => x.Coach)
            .Where(x => x.TrainingSessionId == trainingId && x.SchoolId == context.Value.SchoolId)
            .ToListAsync(cancellationToken);

        var reports = reportRows
            .OrderBy(x => x.AthleteProfile.LastName)
            .ThenBy(x => x.AthleteProfile.FirstName)
            .Select(x => new CoachTrainingAthleteReportItem(
                x.AthleteProfileId,
                x.AthleteProfile.FirstName + " " + x.AthleteProfile.LastName,
                TrainingReportResponse.From(x, training.Title, completedAt, x.Coach.FullName)))
            .ToArray();

        return Results.Ok(new CoachTrainingReportDetailResponse(
            training.Id,
            training.Title,
            completedAt,
            training.Coach.FullName,
            reports));
    }

    private static decimal Average(
        IReadOnlyCollection<TrainingAthleteReport> reports,
        Func<TrainingAthleteReport, decimal> selector)
    {
        return Math.Round(reports.Average(selector), 2);
    }

    private static bool IsValidRequest(SaveTrainingReportRequest request)
    {
        return request.AthleteProfileId != Guid.Empty
            && ReportScoreValidator.IsValidPercentage(request.NutritionScore)
            && ReportScoreValidator.IsValidPercentage(request.CognitiveDevelopmentScore)
            && ReportScoreValidator.IsValidPercentage(request.DisciplineScore)
            && ReportScoreValidator.IsValidPercentage(request.PhysicalConditionScore)
            && ReportScoreValidator.IsValidPercentage(request.PsychologicalDevelopmentScore)
            && ReportScoreValidator.IsValidPercentage(request.TacticalDevelopmentScore)
            && ReportScoreValidator.IsValidPercentage(request.TechnicalDevelopmentScore)
            && (request.CoachNote is null || request.CoachNote.Trim().Length <= 2000);
    }

    private static CoachContext? GetCoachContext(ClaimsPrincipal currentUser)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var coachId = CurrentUser.GetUserId(currentUser);
        return schoolId is null || coachId is null ? null : new CoachContext(schoolId.Value, coachId.Value);
    }
}

public sealed record SaveTrainingReportRequest(
    Guid AthleteProfileId,
    decimal NutritionScore,
    decimal CognitiveDevelopmentScore,
    decimal DisciplineScore,
    decimal PhysicalConditionScore,
    decimal PsychologicalDevelopmentScore,
    decimal TacticalDevelopmentScore,
    decimal TechnicalDevelopmentScore,
    string? CoachNote);

public sealed record TrainingReportResponse(
    Guid Id,
    Guid TrainingSessionId,
    Guid AthleteProfileId,
    Guid CoachId,
    string CoachName,
    string TrainingTitle,
    DateTimeOffset TrainingCompletedAt,
    decimal NutritionScore,
    decimal CognitiveDevelopmentScore,
    decimal DisciplineScore,
    decimal PhysicalConditionScore,
    decimal PsychologicalDevelopmentScore,
    decimal TacticalDevelopmentScore,
    decimal TechnicalDevelopmentScore,
    string? CoachNote,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt)
{
    public static TrainingReportResponse From(
        TrainingAthleteReport report,
        string trainingTitle,
        DateTimeOffset trainingCompletedAt,
        string coachName)
    {
        return new TrainingReportResponse(
            report.Id,
            report.TrainingSessionId,
            report.AthleteProfileId,
            report.CoachId,
            coachName,
            trainingTitle,
            trainingCompletedAt,
            report.NutritionScore,
            report.CognitiveDevelopmentScore,
            report.DisciplineScore,
            report.PhysicalConditionScore,
            report.PsychologicalDevelopmentScore,
            report.TacticalDevelopmentScore,
            report.TechnicalDevelopmentScore,
            report.CoachNote,
            report.CreatedAt,
            report.UpdatedAt);
    }
}

public sealed record DevelopmentSummaryResponse(
    Guid AthleteProfileId,
    string AthleteName,
    int ReportCount,
    int AttendanceCount,
    int PresentCount,
    decimal? AttendanceRate,
    DevelopmentMetricAverages? Averages,
    IReadOnlyCollection<TrainingReportResponse> Reports);

public sealed record DevelopmentMetricAverages(
    decimal Nutrition,
    decimal CognitiveDevelopment,
    decimal Discipline,
    decimal PhysicalCondition,
    decimal PsychologicalDevelopment,
    decimal TacticalDevelopment,
    decimal TechnicalDevelopment);

public sealed record CoachTrainingReportListItem(
    Guid TrainingSessionId,
    string TrainingTitle,
    DateTimeOffset TrainingCompletedAt,
    string CoachName,
    int ReportCount);

public sealed record CoachTrainingReportDetailResponse(
    Guid TrainingSessionId,
    string TrainingTitle,
    DateTimeOffset TrainingCompletedAt,
    string CoachName,
    IReadOnlyCollection<CoachTrainingAthleteReportItem> Reports);

public sealed record CoachTrainingAthleteReportItem(
    Guid AthleteProfileId,
    string AthleteName,
    TrainingReportResponse Report);
