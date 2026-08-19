using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Sportschool.Api.Features.Media;

public interface IMuxVideoClient
{
    Task<MuxDirectUpload> CreateDirectUploadAsync(Guid videoId, CancellationToken cancellationToken);

    Task DeleteAssetAsync(string assetId, CancellationToken cancellationToken);
}

public sealed record MuxDirectUpload(string Id, string Url);

public sealed class MuxVideoClient(HttpClient httpClient, IOptions<MuxOptions> options) : IMuxVideoClient
{
    private readonly MuxOptions _options = options.Value;

    public async Task<MuxDirectUpload> CreateDirectUploadAsync(Guid videoId, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "uploads")
        {
            Content = JsonContent.Create(new
            {
                cors_origin = _options.UploadOrigin,
                timeout = 3600,
                new_asset_settings = new
                {
                    passthrough = videoId.ToString(),
                    playback_policies = new[] { "signed" },
                    video_quality = _options.VideoQuality
                }
            })
        };
        AddAuthorization(request);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<MuxResponse<MuxUploadData>>(cancellationToken);
        if (result?.Data is null || string.IsNullOrWhiteSpace(result.Data.Id) || string.IsNullOrWhiteSpace(result.Data.Url))
        {
            throw new InvalidOperationException("Mux did not return a direct upload URL.");
        }

        return new MuxDirectUpload(result.Data.Id, result.Data.Url);
    }

    public async Task DeleteAssetAsync(string assetId, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"assets/{Uri.EscapeDataString(assetId)}");
        AddAuthorization(request);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return;
        }

        response.EnsureSuccessStatusCode();
    }

    private void AddAuthorization(HttpRequestMessage request)
    {
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.TokenId}:{_options.TokenSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
    }
}

internal sealed record MuxResponse<T>([property: JsonPropertyName("data")] T Data);

internal sealed record MuxUploadData(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("url")] string Url);
