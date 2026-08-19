using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Sportschool.Api.Features.Media;

public interface IMuxPlaybackUrlService
{
    string CreateVideoUrl(string playbackId);
}

public sealed class MuxPlaybackUrlService(IOptions<MuxOptions> options) : IMuxPlaybackUrlService
{
    private static readonly TimeSpan RefreshBeforeExpiration = TimeSpan.FromMinutes(5);
    private readonly MuxOptions _options = options.Value;
    private readonly ConcurrentDictionary<string, CachedPlaybackUrl> _cache = new();

    public string CreateVideoUrl(string playbackId)
    {
        var now = DateTimeOffset.UtcNow;
        if (_cache.TryGetValue(playbackId, out var cached)
            && cached.ExpiresAt > now.Add(RefreshBeforeExpiration))
        {
            return cached.Url;
        }

        var expiresAt = now.AddMinutes(_options.PlaybackTokenMinutes);
        var header = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new
        {
            alg = "RS256",
            typ = "JWT",
            kid = _options.PlaybackSigningKeyId
        }));
        var payload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new
        {
            sub = playbackId,
            aud = "v",
            exp = expiresAt.ToUnixTimeSeconds()
        }));
        var unsignedToken = $"{header}.{payload}";

        using var rsa = RSA.Create();
        var privateKeyPem = Encoding.UTF8.GetString(Convert.FromBase64String(_options.PlaybackSigningPrivateKey));
        rsa.ImportFromPem(privateKeyPem);
        var signature = rsa.SignData(Encoding.UTF8.GetBytes(unsignedToken), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var token = $"{unsignedToken}.{Base64UrlEncode(signature)}";

        var url = $"https://stream.mux.com/{Uri.EscapeDataString(playbackId)}.m3u8?token={Uri.EscapeDataString(token)}";
        _cache[playbackId] = new CachedPlaybackUrl(url, expiresAt);
        return url;
    }

    private static string Base64UrlEncode(byte[] value) =>
        Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private sealed record CachedPlaybackUrl(string Url, DateTimeOffset ExpiresAt);
}
