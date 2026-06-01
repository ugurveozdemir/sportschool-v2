using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Reports;

public static class AthleteReportEndpoints
{
    public static RouteGroupBuilder MapAthleteReportEndpoints(this IEndpointRouteBuilder app)
    {
        var schoolGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        schoolGroup.MapPost("/athlete-reports", CreateReportAsync);
        schoolGroup.MapPut("/athlete-reports/{reportId:guid}", UpdateReportAsync);
        schoolGroup.MapGet("/athletes/{athleteProfileId:guid}/reports", ListSchoolReportsAsync);

        var meGroup = app.MapGroup("/api/me")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Parent.ToString(), UserRole.Athlete.ToString()));

        meGroup.MapGet("/athlete-reports", ListMyReportsAsync);

        return schoolGroup;
    }

    private static async Task<IResult> CreateReportAsync(
        SaveAthleteReportRequest request,
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

        if (!IsValidRequest(request))
        {
            return Results.BadRequest();
        }

        var athleteExists = await db.AthleteProfiles.AnyAsync(
            x => x.Id == request.AthleteProfileId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!athleteExists)
        {
            return Results.NotFound();
        }

        var report = new AthleteReport
        {
            SchoolId = schoolId.Value,
            AthleteProfileId = request.AthleteProfileId,
            CoachId = userId.Value,
            Summary = request.Summary.Trim(),
            ImprovementAreas = request.ImprovementAreas.Trim(),
            SpeedScore = request.SpeedScore,
            StrengthScore = request.StrengthScore,
            DribblingScore = request.DribblingScore,
            ShootingScore = request.ShootingScore
        };

        db.AthleteReports.Add(report);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/school/athlete-reports/{report.Id}", AthleteReportResponse.From(report));
    }

    private static async Task<IResult> UpdateReportAsync(
        Guid reportId,
        SaveAthleteReportRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (!IsValidRequest(request))
        {
            return Results.BadRequest();
        }

        var report = await db.AthleteReports.FirstOrDefaultAsync(
            x => x.Id == reportId && x.SchoolId == schoolId.Value,
            cancellationToken);

        if (report is null)
        {
            return Results.NotFound();
        }

        var athleteExists = await db.AthleteProfiles.AnyAsync(
            x => x.Id == request.AthleteProfileId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!athleteExists)
        {
            return Results.NotFound();
        }

        report.AthleteProfileId = request.AthleteProfileId;
        report.Summary = request.Summary.Trim();
        report.ImprovementAreas = request.ImprovementAreas.Trim();
        report.SpeedScore = request.SpeedScore;
        report.StrengthScore = request.StrengthScore;
        report.DribblingScore = request.DribblingScore;
        report.ShootingScore = request.ShootingScore;
        report.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AthleteReportResponse.From(report));
    }

    private static async Task<IResult> ListSchoolReportsAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var athleteExists = await db.AthleteProfiles.AnyAsync(
            x => x.Id == athleteProfileId && x.SchoolId == schoolId.Value,
            cancellationToken);

        if (!athleteExists)
        {
            return Results.NotFound();
        }

        var reportRows = await db.AthleteReports
            .Where(x => x.SchoolId == schoolId.Value && x.AthleteProfileId == athleteProfileId)
            .ToListAsync(cancellationToken);
        var reports = reportRows
            .OrderByDescending(x => x.CreatedAt)
            .Select(AthleteReportResponse.From)
            .ToList();

        return Results.Ok(reports);
    }

    private static async Task<IResult> ListMyReportsAsync(
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

        var query = db.AthleteProfiles.Where(
            x => x.SchoolId == schoolId.Value
                && (x.UserId == userId.Value || x.ParentUserId == userId.Value)
                && x.IsActive);

        if (athleteProfileId is not null)
        {
            query = query.Where(x => x.Id == athleteProfileId.Value);
        }

        var athleteProfile = await query
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .FirstOrDefaultAsync(cancellationToken);

        if (athleteProfile is null)
        {
            return Results.NotFound();
        }

        var reportRows = await db.AthleteReports
            .Where(x => x.SchoolId == schoolId.Value && x.AthleteProfileId == athleteProfile.Id)
            .ToListAsync(cancellationToken);
        var reports = reportRows
            .OrderByDescending(x => x.CreatedAt)
            .Select(AthleteReportResponse.From)
            .ToList();

        return Results.Ok(reports);
    }

    private static bool IsValidRequest(SaveAthleteReportRequest request)
    {
        return request.AthleteProfileId != Guid.Empty
            && !string.IsNullOrWhiteSpace(request.Summary)
            && !string.IsNullOrWhiteSpace(request.ImprovementAreas)
            && ReportScoreValidator.IsValid(request.SpeedScore)
            && ReportScoreValidator.IsValid(request.StrengthScore)
            && ReportScoreValidator.IsValid(request.DribblingScore)
            && ReportScoreValidator.IsValid(request.ShootingScore);
    }
}

public sealed record SaveAthleteReportRequest(
    Guid AthleteProfileId,
    string Summary,
    string ImprovementAreas,
    decimal SpeedScore,
    decimal StrengthScore,
    decimal DribblingScore,
    decimal ShootingScore);

public sealed record AthleteReportResponse(
    Guid Id,
    Guid AthleteProfileId,
    Guid CoachId,
    string Summary,
    string ImprovementAreas,
    decimal SpeedScore,
    decimal StrengthScore,
    decimal DribblingScore,
    decimal ShootingScore,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt)
{
    public static AthleteReportResponse From(AthleteReport report)
    {
        return new AthleteReportResponse(
            report.Id,
            report.AthleteProfileId,
            report.CoachId,
            report.Summary,
            report.ImprovementAreas,
            report.SpeedScore,
            report.StrengthScore,
            report.DribblingScore,
            report.ShootingScore,
            report.CreatedAt,
            report.UpdatedAt);
    }
}
