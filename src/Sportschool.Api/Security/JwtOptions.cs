namespace Sportschool.Api.Security;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public const string DevelopmentSigningKey = "local-development-signing-key-change-before-production";

    public required string Issuer { get; set; }

    public required string Audience { get; set; }

    public required string SigningKey { get; set; }

    public int AccessTokenMinutes { get; set; } = 15;

    public int RefreshTokenDays { get; set; } = 30;
}
