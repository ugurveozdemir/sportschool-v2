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
        var schoolGroup = app.MapGroup("/api/school/announcements");

        schoolGroup.MapGet("", ListSchoolAnnouncementsAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));
        schoolGroup.MapGet("/unread-count", GetSchoolUnreadCountAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));
        schoolGroup.MapPost("/read", MarkSchoolAllReadAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));
        schoolGroup.MapPost("", CreateAnnouncementAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));
        schoolGroup.MapPut("/{id:guid}", UpdateAnnouncementAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));
        schoolGroup.MapDelete("/{id:guid}", DeactivateAnnouncementAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        var mobileGroup = app.MapGroup("/api/me/announcements")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.Parent.ToString(), UserRole.Athlete.ToString()));

        mobileGroup.MapGet("", ListMobileAnnouncementsAsync);
        mobileGroup.MapGet("/unread-count", GetUnreadCountAsync);
        mobileGroup.MapPost("/read", MarkAllReadAsync);

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
        var userId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || userId is null)
        {
            return Results.Forbid();
        }

        var now = DateTimeOffset.UtcNow;
        var announcementRows = await db.Announcements
            .AsNoTracking()
            .Include(x => x.CreatedBy)
            .Where(x => x.SchoolId == schoolId.Value
                && x.IsActive
                && (x.TrainingSessionId == null
                    || x.TrainingSession!.Groups.Any(group => group.Group.Athletes.Any(membership =>
                        membership.AthleteProfile.UserId == userId.Value
                        || membership.AthleteProfile.ParentUserId == userId.Value))))
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

    private static async Task<IResult> GetUnreadCountAsync(
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
        var activeRows = await db.Announcements
            .AsNoTracking()
            .Where(a => a.SchoolId == schoolId.Value
                && a.IsActive
                && (a.TrainingSessionId == null
                    || a.TrainingSession!.Groups.Any(group => group.Group.Athletes.Any(membership =>
                        membership.AthleteProfile.UserId == userId.Value
                        || membership.AthleteProfile.ParentUserId == userId.Value))))
            .Select(a => new { a.Id, a.ExpiresAt })
            .ToListAsync(cancellationToken);

        var activeIds = activeRows
            .Where(a => a.ExpiresAt == null || a.ExpiresAt > now)
            .Select(a => a.Id)
            .ToHashSet();

        var readIds = await db.AnnouncementReads
            .AsNoTracking()
            .Where(r => r.UserId == userId.Value)
            .Select(r => r.AnnouncementId)
            .ToListAsync(cancellationToken);

        var count = activeIds.Count(id => !readIds.Contains(id));

        return Results.Ok(new UnreadCountResponse(count));
    }

    private static async Task<IResult> GetSchoolUnreadCountAsync(
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
        var activeRows = await db.Announcements
            .AsNoTracking()
            .Where(a => a.SchoolId == schoolId.Value
                && a.IsActive)
            .Select(a => new { a.Id, a.ExpiresAt })
            .ToListAsync(cancellationToken);

        var activeIds = activeRows
            .Where(a => a.ExpiresAt == null || a.ExpiresAt > now)
            .Select(a => a.Id)
            .ToList();

        var readIds = await db.AnnouncementReads
            .AsNoTracking()
            .Where(r => r.UserId == userId.Value)
            .Select(r => r.AnnouncementId)
            .ToHashSetAsync(cancellationToken);

        var count = activeIds.Count(id => !readIds.Contains(id));
        return Results.Ok(new UnreadCountResponse(count));
    }

    private static async Task<IResult> MarkAllReadAsync(
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
        var allIds = await db.Announcements
            .AsNoTracking()
            .Where(a => a.SchoolId == schoolId.Value
                && a.IsActive
                && (a.TrainingSessionId == null
                    || a.TrainingSession!.Groups.Any(group => group.Group.Athletes.Any(membership =>
                        membership.AthleteProfile.UserId == userId.Value
                        || membership.AthleteProfile.ParentUserId == userId.Value))))
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        var alreadyReadIds = await db.AnnouncementReads
            .AsNoTracking()
            .Where(r => r.UserId == userId.Value)
            .Select(r => r.AnnouncementId)
            .ToListAsync(cancellationToken);

        var readSet = new HashSet<Guid>(alreadyReadIds);
        var unreadIds = allIds.Where(id => !readSet.Contains(id)).ToList();

        foreach (var id in unreadIds)
        {
            db.AnnouncementReads.Add(new AnnouncementRead
            {
                AnnouncementId = id,
                UserId = userId.Value,
                ReadAt = now
            });
        }

        if (unreadIds.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> MarkSchoolAllReadAsync(
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
        var announcementRows = await db.Announcements
            .AsNoTracking()
            .Where(a => a.SchoolId == schoolId.Value
                && a.IsActive)
            .Select(a => new { a.Id, a.ExpiresAt })
            .ToListAsync(cancellationToken);

        var allIds = announcementRows
            .Where(a => a.ExpiresAt == null || a.ExpiresAt > now)
            .Select(a => a.Id)
            .ToList();

        var alreadyReadIds = await db.AnnouncementReads
            .AsNoTracking()
            .Where(r => r.UserId == userId.Value)
            .Select(r => r.AnnouncementId)
            .ToListAsync(cancellationToken);

        var readSet = new HashSet<Guid>(alreadyReadIds);
        var unreadIds = allIds.Where(id => !readSet.Contains(id)).ToList();

        foreach (var id in unreadIds)
        {
            db.AnnouncementReads.Add(new AnnouncementRead
            {
                AnnouncementId = id,
                UserId = userId.Value,
                ReadAt = now
            });
        }

        if (unreadIds.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return Results.NoContent();
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

public sealed record UnreadCountResponse(int Count);

public sealed record AnnouncementResponse(
    Guid Id,
    Guid? TrainingSessionId,
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
            announcement.TrainingSessionId,
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
