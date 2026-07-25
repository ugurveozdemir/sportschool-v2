using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Media;

public static class AthleteMediaEndpoints
{
    private const long MaxImageBytes = 5 * 1024 * 1024;
    private const long MaxVideoBytes = 100 * 1024 * 1024;
    private const int MaxPageSize = 20;
    private static readonly HashSet<string> ImageContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private static readonly HashSet<string> VideoContentTypes = ["video/mp4", "video/quicktime"];

    public static IEndpointRouteBuilder MapAthleteMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var adminGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        adminGroup.MapPut("/athletes/{athleteProfileId:guid}/profile-image", UploadProfileImageAsync)
            .DisableAntiforgery();
        adminGroup.MapDelete("/athletes/{athleteProfileId:guid}/profile-image", DeleteProfileImageAsync);
        adminGroup.MapGet("/athletes/{athleteProfileId:guid}/videos", ListAthleteVideosAsync);
        adminGroup.MapPost("/athlete-videos", UploadVideoAsync)
            .DisableAntiforgery();
        adminGroup.MapPatch("/athlete-videos/{videoId:guid}/publication", SetPublicationAsync);
        adminGroup.MapDelete("/athlete-videos/{videoId:guid}", DeleteVideoAsync);

        var memberGroup = app.MapGroup("/api/feed")
            .RequireAuthorization(policy => policy.RequireRole(
                UserRole.SchoolAdmin.ToString(),
                UserRole.Coach.ToString(),
                UserRole.Parent.ToString(),
                UserRole.Athlete.ToString()));

        memberGroup.MapGet("", GetFeedAsync);

        return app;
    }

    private static async Task<IResult> UploadProfileImageAsync(
        Guid athleteProfileId,
        IFormFile image,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        CancellationToken cancellationToken)
    {
        if (!IsValidImage(image))
        {
            return Results.BadRequest(new { message = "Profil fotoğrafı JPEG, PNG veya WebP olmalı ve 5 MB'ı geçmemelidir." });
        }

        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var athlete = await FindActiveAthleteAsync(athleteProfileId, schoolId.Value, db, cancellationToken);
        if (athlete is null)
        {
            return Results.NotFound();
        }

        var newStorageKey = await storage.SaveAsync(
            image,
            $"profile-images/{schoolId.Value:N}/{athlete.Id:N}",
            cancellationToken);
        var previousStorageKey = athlete.ProfileImageStorageKey;
        athlete.ProfileImageStorageKey = newStorageKey;
        await db.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(previousStorageKey))
        {
            await storage.DeleteAsync(previousStorageKey, cancellationToken);
        }

        return Results.Ok(new ProfileImageResponse(athlete.Id, storage.GetPublicUrl(newStorageKey)));
    }

    private static async Task<IResult> DeleteProfileImageAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var athlete = await FindActiveAthleteAsync(athleteProfileId, schoolId.Value, db, cancellationToken);
        if (athlete is null)
        {
            return Results.NotFound();
        }

        if (string.IsNullOrWhiteSpace(athlete.ProfileImageStorageKey))
        {
            return Results.NoContent();
        }

        var storageKey = athlete.ProfileImageStorageKey;
        athlete.ProfileImageStorageKey = null;
        await db.SaveChangesAsync(cancellationToken);
        await storage.DeleteAsync(storageKey, cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> UploadVideoAsync(
        Guid athleteProfileId,
        IFormFile video,
        string? caption,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        CancellationToken cancellationToken)
    {
        if (!IsValidVideo(video) || !IsValidCaption(caption))
        {
            return Results.BadRequest(new { message = "Video MP4 veya MOV olmalı, 100 MB'ı geçmemeli ve açıklama 300 karakterden kısa olmalıdır." });
        }

        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var userId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || userId is null)
        {
            return Results.Forbid();
        }

        var athlete = await FindActiveAthleteAsync(athleteProfileId, schoolId.Value, db, cancellationToken);
        if (athlete is null)
        {
            return Results.NotFound();
        }

        var storageKey = await storage.SaveAsync(
            video,
            $"athlete-videos/{schoolId.Value:N}/{athlete.Id:N}",
            cancellationToken);
        var athleteVideo = new AthleteVideo
        {
            SchoolId = schoolId.Value,
            AthleteProfileId = athlete.Id,
            UploadedByUserId = userId.Value,
            StorageKey = storageKey,
            Caption = string.IsNullOrWhiteSpace(caption) ? null : caption.Trim()
        };

        db.AthleteVideos.Add(athleteVideo);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/school/athlete-videos/{athleteVideo.Id}",
            AthleteVideoResponse.From(athleteVideo, athlete, storage));
    }

    private static async Task<IResult> ListAthleteVideosAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var athlete = await FindActiveAthleteAsync(athleteProfileId, schoolId.Value, db, cancellationToken);
        if (athlete is null)
        {
            return Results.NotFound();
        }

        var videos = await db.AthleteVideos
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value && x.AthleteProfileId == athlete.Id && x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return Results.Ok(videos.Select(x => AthleteVideoResponse.From(x, athlete, storage)));
    }

    private static async Task<IResult> SetPublicationAsync(
        Guid videoId,
        SetVideoPublicationRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var video = await db.AthleteVideos
            .Include(x => x.AthleteProfile)
            .FirstOrDefaultAsync(x => x.Id == videoId && x.SchoolId == schoolId.Value && x.IsActive, cancellationToken);
        if (video is null)
        {
            return Results.NotFound();
        }

        video.IsPublished = request.IsPublished;
        video.PublishedAt = request.IsPublished ? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AthleteVideoResponse.From(video, video.AthleteProfile, storage));
    }

    private static async Task<IResult> DeleteVideoAsync(
        Guid videoId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var video = await db.AthleteVideos
            .FirstOrDefaultAsync(x => x.Id == videoId && x.SchoolId == schoolId.Value && x.IsActive, cancellationToken);
        if (video is null)
        {
            return Results.NotFound();
        }

        video.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);
        await storage.DeleteAsync(video.StorageKey, cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> GetFeedAsync(
        DateTimeOffset? before,
        int? pageSize,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var take = Math.Clamp(pageSize ?? 10, 1, MaxPageSize);
        var query = db.AthleteVideos
            .AsNoTracking()
            .Include(x => x.AthleteProfile)
            .Where(x => x.SchoolId == schoolId.Value
                && x.IsActive
                && x.IsPublished
                && x.Status == AthleteVideoStatus.Ready
                && x.AthleteProfile.IsActive);

        var usesSqlite = db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";
        if (before is not null && !usesSqlite)
        {
            query = query.Where(x => x.PublishedAt < before.Value);
        }

        List<AthleteVideo> videos;
        if (usesSqlite)
        {
            // SQLite cannot order DateTimeOffset values. The production PostgreSQL query below
            // stays server-side; this branch only supports the in-memory SQLite test database.
            var localVideos = await query.ToListAsync(cancellationToken);
            if (before is not null)
            {
                localVideos = localVideos.Where(x => x.PublishedAt < before.Value).ToList();
            }

            videos = localVideos
                .OrderByDescending(x => x.PublishedAt)
                .ThenByDescending(x => x.Id)
                .Take(take + 1)
                .ToList();
        }
        else
        {
            videos = await query
                .OrderByDescending(x => x.PublishedAt)
                .ThenByDescending(x => x.Id)
                .Take(take + 1)
                .ToListAsync(cancellationToken);
        }
        var hasMore = videos.Count > take;
        var items = videos.Take(take)
            .Select(x => AthleteVideoResponse.From(x, x.AthleteProfile, storage))
            .ToList();
        var nextBefore = hasMore ? items[^1].PublishedAt : null;

        return Results.Ok(new AthleteFeedResponse(items, nextBefore));
    }

    private static Task<AthleteProfile?> FindActiveAthleteAsync(
        Guid athleteProfileId,
        Guid schoolId,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        return db.AthleteProfiles
            .FirstOrDefaultAsync(x => x.Id == athleteProfileId && x.SchoolId == schoolId && x.IsActive, cancellationToken);
    }

    private static bool IsValidImage(IFormFile file) => file.Length is > 0 and <= MaxImageBytes
        && ImageContentTypes.Contains(file.ContentType.ToLowerInvariant());

    private static bool IsValidVideo(IFormFile file) => file.Length is > 0 and <= MaxVideoBytes
        && VideoContentTypes.Contains(file.ContentType.ToLowerInvariant());

    private static bool IsValidCaption(string? caption) => caption is null || caption.Trim().Length <= 300;
}

public sealed record ProfileImageResponse(Guid AthleteProfileId, string Url);

public sealed record SetVideoPublicationRequest(bool IsPublished);

public sealed record AthleteVideoResponse(
    Guid Id,
    Guid AthleteProfileId,
    string AthleteFirstName,
    string AthleteLastName,
    string? AthleteProfileImageUrl,
    string VideoUrl,
    string? Caption,
    AthleteVideoStatus Status,
    bool IsPublished,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PublishedAt)
{
    public static AthleteVideoResponse From(AthleteVideo video, AthleteProfile athlete, IMediaStorage storage)
    {
        return new AthleteVideoResponse(
            video.Id,
            athlete.Id,
            athlete.FirstName,
            athlete.LastName,
            athlete.ProfileImageStorageKey is null ? null : storage.GetPublicUrl(athlete.ProfileImageStorageKey),
            storage.GetPublicUrl(video.StorageKey),
            video.Caption,
            video.Status,
            video.IsPublished,
            video.CreatedAt,
            video.PublishedAt);
    }
}

public sealed record AthleteFeedResponse(IReadOnlyList<AthleteVideoResponse> Items, DateTimeOffset? NextBefore);
