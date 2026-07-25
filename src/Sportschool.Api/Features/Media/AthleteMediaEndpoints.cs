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
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var extension = GetImageExtension(image);
        if (extension is null)
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
            extension,
            cancellationToken);
        var previousStorageKey = athlete.ProfileImageStorageKey;
        athlete.ProfileImageStorageKey = newStorageKey;
        await db.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(previousStorageKey))
        {
            await storage.DeleteAsync(previousStorageKey, cancellationToken);
        }

        return Results.Ok(new ProfileImageResponse(athlete.Id, mediaUrls.CreateProfileImageUrl(schoolId.Value, athlete.Id)));
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
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var extension = GetVideoExtension(video);
        if (extension is null || !IsValidCaption(caption))
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
            extension,
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
            AthleteVideoResponse.From(athleteVideo, athlete, mediaUrls));
    }

    private static async Task<IResult> ListAthleteVideosAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
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

        return Results.Ok(videos.Select(x => AthleteVideoResponse.From(x, athlete, mediaUrls)));
    }

    private static async Task<IResult> SetPublicationAsync(
        Guid videoId,
        SetVideoPublicationRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
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

        return Results.Ok(AthleteVideoResponse.From(video, video.AthleteProfile, mediaUrls));
    }

    private static async Task<IResult> DeleteVideoAsync(
        Guid videoId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        IMediaStorage storage,
        MediaAccessUrlService mediaUrls,
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
        Guid? beforeId,
        int? pageSize,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
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
            query = query.Where(x => x.PublishedAt < before.Value
                || (beforeId.HasValue && x.PublishedAt == before.Value && x.Id.CompareTo(beforeId.Value) < 0));
        }

        List<AthleteVideo> videos;
        if (usesSqlite)
        {
            // SQLite cannot order DateTimeOffset values. The production PostgreSQL query below
            // stays server-side; this branch only supports the in-memory SQLite test database.
            var localVideos = await query.ToListAsync(cancellationToken);
            if (before is not null)
            {
                localVideos = localVideos.Where(x => x.PublishedAt < before.Value
                    || (beforeId.HasValue && x.PublishedAt == before.Value && x.Id.CompareTo(beforeId.Value) < 0)).ToList();
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
            .Select(x => AthleteVideoResponse.From(x, x.AthleteProfile, mediaUrls))
            .ToList();
        var nextBefore = hasMore ? items[^1].PublishedAt : null;
        Guid? nextBeforeId = hasMore ? items[^1].Id : null;

        return Results.Ok(new AthleteFeedResponse(items, nextBefore, nextBeforeId));
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

    private static bool IsValidCaption(string? caption) => caption is null || caption.Trim().Length <= 300;

    private static string? GetImageExtension(IFormFile file)
    {
        if (file.Length is <= 0 or > MaxImageBytes)
        {
            return null;
        }

        var header = ReadHeader(file, 12);
        return file.ContentType.ToLowerInvariant() switch
        {
            "image/jpeg" when header is [0xFF, 0xD8, 0xFF, ..] => ".jpg",
            "image/png" when header is [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ..] => ".png",
            "image/webp" when header.Length >= 12
                && header.AsSpan(0, 4).SequenceEqual("RIFF"u8)
                && header.AsSpan(8, 4).SequenceEqual("WEBP"u8) => ".webp",
            _ => null
        };
    }

    private static string? GetVideoExtension(IFormFile file)
    {
        if (file.Length is <= 0 or > MaxVideoBytes)
        {
            return null;
        }

        var header = ReadHeader(file, 12);
        if (header.Length < 12 || !header.AsSpan(4, 4).SequenceEqual("ftyp"u8))
        {
            return null;
        }

        return file.ContentType.ToLowerInvariant() switch
        {
            "video/mp4" => ".mp4",
            "video/quicktime" when header.AsSpan(8, 4).SequenceEqual("qt  "u8) => ".mov",
            _ => null
        };
    }

    private static byte[] ReadHeader(IFormFile file, int length)
    {
        using var stream = file.OpenReadStream();
        var header = new byte[length];
        var bytesRead = stream.Read(header, 0, header.Length);
        return header[..bytesRead];
    }
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
    public static AthleteVideoResponse From(AthleteVideo video, AthleteProfile athlete, MediaAccessUrlService mediaUrls)
    {
        return new AthleteVideoResponse(
            video.Id,
            athlete.Id,
            athlete.FirstName,
            athlete.LastName,
            athlete.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(athlete.SchoolId, athlete.Id),
            mediaUrls.CreateVideoUrl(video.SchoolId, video.Id),
            video.Caption,
            video.Status,
            video.IsPublished,
            video.CreatedAt,
            video.PublishedAt);
    }
}

public sealed record AthleteFeedResponse(IReadOnlyList<AthleteVideoResponse> Items, DateTimeOffset? NextBefore, Guid? NextBeforeId);
