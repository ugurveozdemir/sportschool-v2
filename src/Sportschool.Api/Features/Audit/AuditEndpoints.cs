using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.SchoolManagement;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Audit;

public static class AuditEndpoints
{
    private const int DefaultPageSize = 50;
    private const int MaximumDateRangeDays = 366;

    public static IEndpointRouteBuilder MapAuditEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/platform/audit-logs", ListPlatformAuditLogsAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.PlatformOwner.ToString()));
        app.MapGet("/api/school/audit-logs", ListSchoolAuditLogsAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        return app;
    }

    private static Task<IResult> ListPlatformAuditLogsAsync(
        Guid? schoolId,
        Guid? userId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        int? page,
        int? pageSize,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        return ListAuditLogsAsync(schoolId, userId, from, to, page, pageSize, db, cancellationToken);
    }

    private static Task<IResult> ListSchoolAuditLogsAsync(
        Guid? userId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        int? page,
        int? pageSize,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        return schoolId is null
            ? Task.FromResult(Results.Forbid() as IResult)
            : ListAuditLogsAsync(schoolId.Value, userId, from, to, page, pageSize, db, cancellationToken);
    }

    private static async Task<IResult> ListAuditLogsAsync(
        Guid? schoolId,
        Guid? userId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        int? page,
        int? pageSize,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var rangeStart = (from ?? now.AddDays(-30)).ToUniversalTime();
        var rangeEnd = (to ?? now).ToUniversalTime();
        var selectedPage = page ?? 1;
        var selectedPageSize = pageSize ?? DefaultPageSize;
        if (!RequestValidation.HasValidDateRange(rangeStart, rangeEnd, MaximumDateRangeDays)
            || !RequestValidation.HasValidPagination(selectedPage, selectedPageSize))
        {
            return Results.BadRequest();
        }

        var query = db.AuditLogs.AsNoTracking().AsQueryable();
        if (schoolId is not null)
        {
            query = query.Where(x => x.SchoolId == schoolId.Value);
        }

        if (userId is not null)
        {
            query = query.Where(x => x.UserId == userId.Value);
        }

        List<AuditLog> rows;
        int totalCount;
        if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            var candidates = await query.ToListAsync(cancellationToken);
            var filtered = candidates
                .Where(x => x.CreatedAt >= rangeStart && x.CreatedAt < rangeEnd)
                .OrderByDescending(x => x.CreatedAt)
                .ToList();
            totalCount = filtered.Count;
            rows = filtered
                .Skip((selectedPage - 1) * selectedPageSize)
                .Take(selectedPageSize)
                .ToList();
        }
        else
        {
            query = query.Where(x => x.CreatedAt >= rangeStart && x.CreatedAt < rangeEnd);
            totalCount = await query.CountAsync(cancellationToken);
            rows = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((selectedPage - 1) * selectedPageSize)
                .Take(selectedPageSize)
                .ToListAsync(cancellationToken);
        }

        var items = rows.Select(AuditLogResponse.From).ToArray();
        return Results.Ok(new PaginatedList<AuditLogResponse>(items, totalCount, selectedPage, selectedPageSize));
    }
}

public sealed record AuditLogResponse(
    Guid Id,
    Guid? UserId,
    Guid? SchoolId,
    string Method,
    string Path,
    int StatusCode,
    string CorrelationId,
    DateTimeOffset CreatedAt)
{
    public static AuditLogResponse From(AuditLog log)
    {
        return new AuditLogResponse(
            log.Id,
            log.UserId,
            log.SchoolId,
            log.Method,
            log.Path,
            log.StatusCode,
            log.CorrelationId,
            log.CreatedAt);
    }
}
