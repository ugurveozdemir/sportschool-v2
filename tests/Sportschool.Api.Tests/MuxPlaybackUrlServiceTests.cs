using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Sportschool.Api.Features.Media;

namespace Sportschool.Api.Tests;

public sealed class MuxPlaybackUrlServiceTests
{
    [Fact]
    public void CreatesValidSignedPlaybackUrl()
    {
        using var rsa = RSA.Create(2048);
        var privateKey = Convert.ToBase64String(Encoding.UTF8.GetBytes(rsa.ExportRSAPrivateKeyPem()));
        var options = Options.Create(new MuxOptions
        {
            PlaybackSigningKeyId = "signing-key",
            PlaybackSigningPrivateKey = privateKey,
            PlaybackTokenMinutes = 60
        });
        var service = new MuxPlaybackUrlService(options);

        var url = new Uri(service.CreateVideoUrl("playback-id"));

        Assert.Equal("stream.mux.com", url.Host);
        Assert.Equal("/playback-id.m3u8", url.AbsolutePath);
        var token = Uri.UnescapeDataString(url.Query["?token=".Length..]);
        var parts = token.Split('.');
        Assert.Equal(3, parts.Length);

        using var header = JsonDocument.Parse(Decode(parts[0]));
        using var payload = JsonDocument.Parse(Decode(parts[1]));
        Assert.Equal("RS256", header.RootElement.GetProperty("alg").GetString());
        Assert.Equal("signing-key", header.RootElement.GetProperty("kid").GetString());
        Assert.Equal("playback-id", payload.RootElement.GetProperty("sub").GetString());
        Assert.Equal("v", payload.RootElement.GetProperty("aud").GetString());
        Assert.True(rsa.VerifyData(
            Encoding.UTF8.GetBytes($"{parts[0]}.{parts[1]}"),
            Decode(parts[2]),
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1));
    }

    private static byte[] Decode(string value)
    {
        var base64 = value.Replace('-', '+').Replace('_', '/');
        base64 = base64.PadRight(base64.Length + (4 - base64.Length % 4) % 4, '=');
        return Convert.FromBase64String(base64);
    }
}
