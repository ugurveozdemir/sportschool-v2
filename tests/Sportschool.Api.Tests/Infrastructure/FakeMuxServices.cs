using Sportschool.Api.Features.Media;

namespace Sportschool.Api.Tests.Infrastructure;

public sealed class FakeMuxVideoClient : IMuxVideoClient
{
    public List<Guid> CreatedVideoIds { get; } = [];

    public List<string> DeletedAssetIds { get; } = [];

    public Task<MuxDirectUpload> CreateDirectUploadAsync(Guid videoId, CancellationToken cancellationToken)
    {
        CreatedVideoIds.Add(videoId);
        return Task.FromResult(new MuxDirectUpload($"upload-{videoId:N}", $"https://upload.mux.test/{videoId:N}"));
    }

    public Task DeleteAssetAsync(string assetId, CancellationToken cancellationToken)
    {
        DeletedAssetIds.Add(assetId);
        return Task.CompletedTask;
    }
}

public sealed class FakeMuxPlaybackUrlService : IMuxPlaybackUrlService
{
    public string CreateVideoUrl(string playbackId) => $"https://stream.mux.test/{playbackId}.m3u8?token=test";
}
