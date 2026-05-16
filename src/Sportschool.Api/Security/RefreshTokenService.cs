using System.Security.Cryptography;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Security;

public sealed class RefreshTokenService
{
    private const int TokenSize = 64;
    private readonly JwtOptions _options;

    public RefreshTokenService(Microsoft.Extensions.Options.IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public IssuedRefreshToken CreateToken(Guid userId, UserRole role, string? deviceName)
    {
        var token = Base64UrlEncode(RandomNumberGenerator.GetBytes(TokenSize));
        var entity = new RefreshToken
        {
            UserId = userId,
            Role = role,
            TokenHash = HashToken(token),
            DeviceName = string.IsNullOrWhiteSpace(deviceName) ? null : deviceName.Trim(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_options.RefreshTokenDays)
        };

        return new IssuedRefreshToken(token, entity);
    }

    public string HashToken(string token)
    {
        return Base64UrlEncode(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}

public sealed record IssuedRefreshToken(string PlainTextToken, RefreshToken Entity);
