using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Announcements;

public static class AnnouncementEndpoints
{
    private const int NewAnnouncementDays = 7;

    public static IEndpointRouteBuilder MapAnnouncementEndpoints(this IEndpointRouteBuilder app)
    {
        var schoolGroup = app.MapGroup("/api/school/announcements")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        schoolGroup.MapGet("", ListSchoolAnnouncementsAsync);
        schoolGroup.MapPost("", CreateAnnouncementAsync);
        schoolGroup.MapPut("/{id:guid}", UpdateAnnouncementAsync);
        schoolGroup.MapDelete("/{id:guid}", DeactivateAnnouncementAsync);

        var mobileGroup = app.MapGroup("/api/me/announcements")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Parent.ToString(), UserRole.Athlete.ToString()));

        mobileGroup.MapGet("", ListMobileAnnouncementsAsync);

        return app;
    }

    private static async Task<IResult> ListSchoolAnnouncementsAsync(
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
        var announcementRows = await db.Announcements
            .AsNoTracking()
            .Include(x => x.CreatedBy)
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive)
            .ToListAsync(cancellationToken);
        var announcements = announcementRows
            .OrderByDescending(x => x.PublishedAt)
            .Select(x => AnnouncementResponse.From(x, x.CreatedBy?.FullName, now, NewAnnouncementDays))
            .ToList();

        return Results.Ok(announcements);
    }

    private static async Task<IResult> ListMobileAnnouncementsAsync(
        bool? currentOnly,
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
        var announcementRows = await db.Announcements
            .AsNoTracking()
            .Include(x => x.CreatedBy)
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive)
            .ToListAsync(cancellationToken);

        if (currentOnly == true)
        {
            announcementRows = announcementRows
                .Where(x => x.ExpiresAt == null || x.ExpiresAt > now)
                .ToList();
        }

        var announcements = announcementRows
            .OrderByDescending(x => x.PublishedAt)
            .Select(x => AnnouncementResponse.From(x, x.CreatedBy?.FullName, now, NewAnnouncementDays))
            .ToList();

        return Results.Ok(announcements);
    }

    private static async Task<IResult> CreateAnnouncementAsync(
        SaveAnnouncementRequest request,
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

        var now = DateTimeOffset.UtcNow;
        if (!IsValidRequest(request, now))
        {
            return Results.BadRequest();
        }

        var announcement = new Announcement
        {
            SchoolId = schoolId.Value,
            CreatedByUserId = userId.Value,
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            PublishedAt = now,
            ExpiresAt = request.ExpiresAt,
            CreatedAt = now
        };

        db.Announcements.Add(announcement);
        await db.SaveChangesAsync(cancellationToken);

        var createdByName = await db.Users
            .Where(x => x.Id == userId.Value)
            .Select(x => x.FullName)
            .FirstAsync(cancellationToken);

        return Results.Created(
            $"/api/school/announcements/{announcement.Id}",
            AnnouncementResponse.From(announcement, createdByName, now, NewAnnouncementDays));
    }

    private static async Task<IResult> UpdateAnnouncementAsync(
        Guid id,
        SaveAnnouncementRequest request,
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

        var now = DateTimeOffset.UtcNow;
        if (!IsValidRequest(request, now))
        {
            return Results.BadRequest();
        }

        var announcement = await db.Announcements
            .Include(x => x.CreatedBy)
            .FirstOrDefaultAsync(x => x.Id == id && x.SchoolId == schoolId.Value && x.IsActive, cancellationToken);

        if (announcement is null || !CanManageAnnouncement(currentUser, announcement, userId.Value))
        {
            return Results.NotFound();
        }

        announcement.Title = request.Title.Trim();
        announcement.Content = request.Content.Trim();
        announcement.ExpiresAt = request.ExpiresAt;
        announcement.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AnnouncementResponse.From(
            announcement,
            announcement.CreatedBy?.FullName,
            now,
            NewAnnouncementDays));
    }

    private static async Task<IResult> DeactivateAnnouncementAsync(
        Guid id,
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

        var announcement = await db.Announcements.FirstOrDefaultAsync(
            x => x.Id == id && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (announcement is null || !CanManageAnnouncement(currentUser, announcement, userId.Value))
        {
            return Results.NotFound();
        }

        announcement.IsActive = false;
        announcement.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static bool CanManageAnnouncement(ClaimsPrincipal currentUser, Announcement announcement, Guid userId)
    {
        return currentUser.IsInRole(UserRole.SchoolAdmin.ToString()) || announcement.CreatedByUserId == userId;
    }

    private static bool IsValidRequest(SaveAnnouncementRequest request, DateTimeOffset now)
    {
        return !string.IsNullOrWhiteSpace(request.Title)
            && request.Title.Trim().Length <= 160
            && !string.IsNullOrWhiteSpace(request.Content)
            && request.Content.Trim().Length <= 2000
            && (request.ExpiresAt is null || request.ExpiresAt > now);
    }
}

public sealed record SaveAnnouncementRequest(string Title, string Content, DateTimeOffset? ExpiresAt);

public sealed record AnnouncementResponse(
    Guid Id,
    string Title,
    string Content,
    Guid? CreatedByUserId,
    string? CreatedByName,
    DateTimeOffset PublishedAt,
    DateTimeOffset? ExpiresAt,
    bool IsNew,
    bool IsExpired)
{
    public static AnnouncementResponse From(
        Announcement announcement,
        string? createdByName,
        DateTimeOffset now,
        int newAnnouncementDays)
    {
        var isExpired = announcement.ExpiresAt is not null && announcement.ExpiresAt <= now;
        return new AnnouncementResponse(
            announcement.Id,
            announcement.Title,
            announcement.Content,
            announcement.CreatedByUserId,
            createdByName,
            announcement.PublishedAt,
            announcement.ExpiresAt,
            !isExpired && announcement.PublishedAt >= now.AddDays(-newAnnouncementDays),
            isExpired);
    }
}
