using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class AuthEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public AuthEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task LoginSchools_ReturnsOnlyActiveSchools()
    {
        await _factory.SeedAsync(db =>
        {
            db.Schools.AddRange(
                new School
                {
                    Name = "Active School",
                    Code = "active",
                    NormalizedCode = TextNormalizer.NormalizeSchoolCode("active")
                },
                new School
                {
                    Name = "Inactive School",
                    Code = "inactive",
                    NormalizedCode = TextNormalizer.NormalizeSchoolCode("inactive"),
                    IsActive = false
                });
            return Task.CompletedTask;
        });

        using var client = _factory.CreateClient();

        var schools = await client.GetFromJsonAsync<LoginSchoolResponse[]>("/api/auth/schools");

        Assert.NotNull(schools);
        var school = Assert.Single(schools);
        Assert.Equal("Active School", school.Name);
        Assert.Equal("active", school.Code);
    }

    [Fact]
    public async Task ChangePassword_UpdatesPasswordAndRevokesActiveRefreshTokens()
    {
        var user = TestUsers.Create(null, "owner-auth@example.com", "Owner Auth", "old-password", UserRole.PlatformOwner);

        await _factory.SeedAsync(db =>
        {
            db.Users.Add(user);
            db.RefreshTokens.Add(new RefreshToken
            {
                User = user,
                Role = UserRole.PlatformOwner,
                TokenHash = "active-refresh-token-hash",
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(30)
            });

            return Task.CompletedTask;
        });

        using var client = _factory.CreateAuthenticatedClient(user, UserRole.PlatformOwner);

        using var response = await client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = "old-password",
            newPassword = "new-password"
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var result = await _factory.QueryAsync(async db =>
        {
            var savedUser = await db.Users
                .Include(x => x.RefreshTokens)
                .SingleAsync(x => x.Id == user.Id);

            return new
            {
                savedUser.PasswordHash,
                ActiveRefreshTokenCount = savedUser.RefreshTokens.Count(x => x.IsActive)
            };
        });

        var passwordHasher = new PasswordHasher();
        Assert.True(passwordHasher.Verify("new-password", result.PasswordHash));
        Assert.False(passwordHasher.Verify("old-password", result.PasswordHash));
        Assert.Equal(0, result.ActiveRefreshTokenCount);
    }
}
