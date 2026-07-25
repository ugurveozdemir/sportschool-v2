using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Media;

public enum MediaResourceType
{
    ProfileImage,
    AthleteVideo
}

public sealed class MediaAccessUrlService(IOptions<JwtOptions> jwtOptions)
{
    private static readonly TimeSpan UrlLifetime = TimeSpan.FromMinutes(15);
    private readonly byte[] _signingKey = Encoding.UTF8.GetBytes(jwtOptions.Value.SigningKey);

    public string CreateProfileImageUrl(Guid schoolId, Guid athleteProfileId, Guid? version) =>
        CreateUrl(MediaResourceType.ProfileImage, schoolId, athleteProfileId, $"/api/media/profile-images/{athleteProfileId}", version);

    public string CreateVideoUrl(Guid schoolId, Guid videoId) =>
        CreateUrl(MediaResourceType.AthleteVideo, schoolId, videoId, $"/api/media/athlete-videos/{videoId}");

    public bool TryValidate(string? token, MediaResourceType expectedType, Guid expectedResourceId, out Guid schoolId)
    {
        schoolId = Guid.Empty;
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var parts = token.Split('.', 2);
        if (parts.Length != 2)
        {
            return false;
        }

        byte[] payloadBytes;
        byte[] signature;
        try
        {
            payloadBytes = Decode(parts[0]);
            signature = Decode(parts[1]);
        }
        catch (FormatException)
        {
            return false;
        }

        var expectedSignature = Sign(payloadBytes);
        if (!CryptographicOperations.FixedTimeEquals(signature, expectedSignature))
        {
            return false;
        }

        var fields = Encoding.UTF8.GetString(payloadBytes).Split(':');
        if (fields.Length != 4
            || !Enum.TryParse<MediaResourceType>(fields[0], out var resourceType)
            || resourceType != expectedType
            || !Guid.TryParseExact(fields[1], "N", out schoolId)
            || !Guid.TryParseExact(fields[2], "N", out var resourceId)
            || resourceId != expectedResourceId
            || !long.TryParse(fields[3], out var expiresAt))
        {
            return false;
        }

        return DateTimeOffset.UtcNow < DateTimeOffset.FromUnixTimeSeconds(expiresAt);
    }

    private string CreateUrl(MediaResourceType resourceType, Guid schoolId, Guid resourceId, string path, Guid? version = null)
    {
        var expiresAt = DateTimeOffset.UtcNow.Add(UrlLifetime).ToUnixTimeSeconds();
        var payload = Encoding.UTF8.GetBytes($"{resourceType}:{schoolId:N}:{resourceId:N}:{expiresAt}");
        var token = $"{Encode(payload)}.{Encode(Sign(payload))}";
        var versionQuery = version is null ? string.Empty : $"&v={version.Value:N}";
        return $"{path}?token={Uri.EscapeDataString(token)}{versionQuery}";
    }

    private byte[] Sign(byte[] payload) => HMACSHA256.HashData(_signingKey, payload);

    private static string Encode(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Decode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }
}
