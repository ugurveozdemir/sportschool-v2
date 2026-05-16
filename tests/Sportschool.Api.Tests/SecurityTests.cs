using Microsoft.Extensions.Options;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Tests;

public sealed class SecurityTests
{
    [Fact]
    public void PasswordHasher_VerifiesOriginalPasswordOnly()
    {
        var hasher = new PasswordHasher();

        var hash = hasher.Hash("correct-password");

        Assert.True(hasher.Verify("correct-password", hash));
        Assert.False(hasher.Verify("wrong-password", hash));
    }

    [Fact]
    public void RefreshTokenService_StoresHashInsteadOfPlainToken()
    {
        var service = CreateRefreshTokenService();

        var issuedToken = service.CreateToken(Guid.NewGuid(), UserRole.Coach, "iPhone");

        Assert.NotEqual(issuedToken.PlainTextToken, issuedToken.Entity.TokenHash);
        Assert.Equal(service.HashToken(issuedToken.PlainTextToken), issuedToken.Entity.TokenHash);
        Assert.Equal(UserRole.Coach, issuedToken.Entity.Role);
        Assert.Equal("iPhone", issuedToken.Entity.DeviceName);
    }

    private static RefreshTokenService CreateRefreshTokenService()
    {
        return new RefreshTokenService(Options.Create(new JwtOptions
        {
            Issuer = "Sportschool",
            Audience = "SportschoolClients",
            SigningKey = "test-signing-key-with-at-least-32-characters",
            RefreshTokenDays = 30
        }));
    }
}
