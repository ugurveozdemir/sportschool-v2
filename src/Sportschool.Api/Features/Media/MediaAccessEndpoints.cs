using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;

namespace Sportschool.Api.Features.Media;

public static class MediaAccessEndpoints
{
    public static IEndpointRouteBuilder MapMediaAccessEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/media");
        group.MapGet("/profile-images/{athleteProfileId:guid}", GetProfileImageAsync);
        group.MapGet("/athlete-videos/{videoId:guid}", GetVideoAsync);
        return app;
    }

    private static async Task<IResult> GetProfileImageAsync(
        Guid athleteProfileId,
        string? token,
        SportschoolDbContext db,
        IMediaStorage storage,
        MediaAccessUrlService mediaUrls,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (!mediaUrls.TryValidate(token, MediaResourceType.ProfileImage, athleteProfileId, out var schoolId))
        {
            return Results.Unauthorized();
        }

        var profile = await db.AthleteProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == athleteProfileId && x.SchoolId == schoolId && x.IsActive, cancellationToken);
        return profile?.ProfileImageStorageKey is null
            ? Results.NotFound()
            : await FileResultAsync(profile.ProfileImageStorageKey, storage, httpContext, cancellationToken);
    }

    private static async Task<IResult> GetVideoAsync(
        Guid videoId,
        string? token,
        SportschoolDbContext db,
        IMediaStorage storage,
        MediaAccessUrlService mediaUrls,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (!mediaUrls.TryValidate(token, MediaResourceType.AthleteVideo, videoId, out var schoolId))
        {
            return Results.Unauthorized();
        }

        var video = await db.AthleteVideos
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == videoId && x.SchoolId == schoolId && x.IsActive && x.AthleteProfile.IsActive,
                cancellationToken);
        return video?.StorageKey is null
            ? Results.NotFound()
            : await FileResultAsync(video.StorageKey, storage, httpContext, cancellationToken);
    }

    private static async Task<IResult> FileResultAsync(
        string storageKey,
        IMediaStorage storage,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var media = await storage.OpenReadAsync(storageKey, cancellationToken);
        if (media is null)
        {
            return Results.NotFound();
        }

        httpContext.Response.RegisterForDispose(media.Content);
        httpContext.Response.Headers["X-Content-Type-Options"] = "nosniff";
        return Results.File(media.Content, media.ContentType, enableRangeProcessing: true);
    }
}
