using Microsoft.Extensions.DependencyInjection;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Bootstrap;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class PlatformOwnerMaintenanceTests
{
    [Fact]
    public async Task Provision_CreatesOnlyTheFirstPlatformOwner()
    {
        await using var factory = new TestAppFactory();
        using var scope = factory.Services.CreateScope();
        var maintenance = scope.ServiceProvider.GetRequiredService<PlatformOwnerMaintenance>();

        var user = await maintenance.ProvisionAsync("owner@example.com", "Platform Owner", "secure-password");

        Assert.Equal("owner@example.com", user.Email);
        Assert.Contains(user.Roles, x => x.Role == UserRole.PlatformOwner);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            maintenance.ProvisionAsync("other@example.com", "Other Owner", "secure-password"));
    }

    [Fact]
    public async Task ResetPassword_ChangesHashAndRevokesActiveRefreshTokens()
    {
        await using var factory = new TestAppFactory();
        var owner = TestUsers.Create(null, "recovery@example.com", "Recovery Owner", "old-password", UserRole.PlatformOwner);
        owner.RefreshTokens.Add(new RefreshToken
        {
            User = owner,
            Role = UserRole.PlatformOwner,
            TokenHash = "active-token-hash",
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(1)
        });
        await factory.SeedAsync(db =>
        {
            db.Users.Add(owner);
            return Task.CompletedTask;
        });

        using var scope = factory.Services.CreateScope();
        var maintenance = scope.ServiceProvider.GetRequiredService<PlatformOwnerMaintenance>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();

        var user = await maintenance.ResetPasswordAsync("recovery@example.com", "new-password");

        Assert.True(passwordHasher.Verify("new-password", user.PasswordHash));
        Assert.False(passwordHasher.Verify("old-password", user.PasswordHash));
        Assert.NotNull(Assert.Single(user.RefreshTokens).RevokedAt);
    }
}
