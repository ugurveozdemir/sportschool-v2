using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class AuthEndpointTests : IClassFixture<TestAppFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

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
        Assert.Contains(schools, school => school.Name == "Active School" && school.Code == "active");
        Assert.DoesNotContain(schools, school => school.Name == "Inactive School" || school.Code == "inactive");
    }

    [Fact]
    public async Task Login_AllowsCoachModeForSchoolCoach()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var school = new School
        {
            Name = $"Coach Login {suffix}",
            Code = $"coach-login-{suffix}",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode($"coach-login-{suffix}")
        };
        var coach = TestUsers.Create(school.Id, $"coach-login-{suffix}@example.com", "Coach Login", "coach-password", UserRole.Coach);

        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(school);
            db.Users.Add(coach);
            return Task.CompletedTask;
        });

        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            schoolCode = school.Code,
            email = coach.Email,
            password = "coach-password",
            mode = LoginMode.Coach,
            deviceName = "test"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(auth);
        Assert.Contains(UserRole.Coach, auth!.Roles);
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
