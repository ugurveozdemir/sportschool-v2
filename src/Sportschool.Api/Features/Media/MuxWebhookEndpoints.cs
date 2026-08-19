using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sportschool.Api.Data;

namespace Sportschool.Api.Features.Media;

public static class MuxWebhookEndpoints
{
    public static IEndpointRouteBuilder MapMuxWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/webhooks/mux", HandleAsync);
        return app;
    }

    private static async Task<IResult> HandleAsync(
        HttpRequest request,
        SportschoolDbContext db,
        MuxWebhookVerifier verifier,
        IMuxVideoClient mux,
        IOptions<MuxOptions> muxOptions,
        CancellationToken cancellationToken)
    {
        if (!muxOptions.Value.Enabled)
        {
            return Results.NotFound();
        }

        using var reader = new StreamReader(request.Body);
        var body = await reader.ReadToEndAsync(cancellationToken);
        if (!verifier.IsValid(body, request.Headers["Mux-Signature"].FirstOrDefault()))
        {
            return Results.Unauthorized();
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(body);
        }
        catch (JsonException)
        {
            return Results.BadRequest();
        }

        using (document)
        {
            var root = document.RootElement;
            if (!root.TryGetProperty("type", out var typeElement)
                || !root.TryGetProperty("data", out var data))
            {
                return Results.BadRequest();
            }

            var eventType = typeElement.GetString();
            if (eventType is "video.asset.ready" or "video.asset.errored")
            {
                await UpdateFromAssetEventAsync(eventType, data, db, mux, cancellationToken);
            }
            else if (eventType is "video.upload.errored" or "video.upload.cancelled" or "video.upload.timed_out")
            {
                await MarkUploadFailedAsync(data, db, cancellationToken);
            }

            return Results.Ok();
        }
    }

    private static async Task UpdateFromAssetEventAsync(
        string eventType,
        JsonElement data,
        SportschoolDbContext db,
        IMuxVideoClient mux,
        CancellationToken cancellationToken)
    {
        var passthrough = data.TryGetProperty("passthrough", out var passthroughElement)
            ? passthroughElement.GetString()
            : null;
        if (!Guid.TryParse(passthrough, out var videoId))
        {
            return;
        }

        var video = await db.AthleteVideos.FirstOrDefaultAsync(x => x.Id == videoId, cancellationToken);
        if (video is null)
        {
            return;
        }

        var assetId = data.TryGetProperty("id", out var assetIdElement) ? assetIdElement.GetString() : null;
        if (string.IsNullOrWhiteSpace(assetId))
        {
            return;
        }

        video.MuxAssetId = assetId;
        if (eventType == "video.asset.errored")
        {
            video.Status = AthleteVideoStatus.Failed;
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        var playbackId = FindSignedPlaybackId(data);
        if (playbackId is null)
        {
            video.Status = AthleteVideoStatus.Failed;
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        video.MuxPlaybackId = playbackId;
        video.Status = AthleteVideoStatus.Ready;
        await db.SaveChangesAsync(cancellationToken);

        if (!video.IsActive)
        {
            await mux.DeleteAssetAsync(assetId, cancellationToken);
        }
    }

    private static async Task MarkUploadFailedAsync(
        JsonElement data,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var uploadId = data.TryGetProperty("id", out var uploadIdElement) ? uploadIdElement.GetString() : null;
        if (string.IsNullOrWhiteSpace(uploadId))
        {
            return;
        }

        var video = await db.AthleteVideos.FirstOrDefaultAsync(
            x => x.MuxUploadId == uploadId && x.Status == AthleteVideoStatus.Processing,
            cancellationToken);
        if (video is null)
        {
            return;
        }

        video.Status = AthleteVideoStatus.Failed;
        await db.SaveChangesAsync(cancellationToken);
    }

    private static string? FindSignedPlaybackId(JsonElement data)
    {
        if (!data.TryGetProperty("playback_ids", out var playbackIds)
            || playbackIds.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var playbackId in playbackIds.EnumerateArray())
        {
            var policy = playbackId.TryGetProperty("policy", out var policyElement) ? policyElement.GetString() : null;
            var id = playbackId.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
            if (policy == "signed" && !string.IsNullOrWhiteSpace(id))
            {
                return id;
            }
        }

        return null;
    }
}
