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
    public async Task Login_ResolvesSchoolFromAccount_WithoutSchoolCode()
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
            email = coach.Email,
            password = "coach-password",
            mode = LoginMode.Coach,
            deviceName = "test"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(auth);
        Assert.Contains(UserRole.Coach, auth!.Roles);
        Assert.Equal(school.Id, auth.SchoolId);
    }

    [Fact]
    public async Task Login_FromCoachMode_UsesSchoolAdminRoleForSchoolAdminAccount()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var school = new School
        {
            Name = $"School Admin Login {suffix}",
            Code = $"school-admin-login-{suffix}",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode($"school-admin-login-{suffix}")
        };
        var admin = TestUsers.Create(school.Id, $"admin-login-{suffix}@example.com", "School Admin", "admin-password", UserRole.SchoolAdmin);

        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(school);
            db.Users.Add(admin);
            return Task.CompletedTask;
        });

        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = admin.Email,
            password = "admin-password",
            mode = LoginMode.Coach,
            deviceName = "test"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(auth);
        Assert.Equal(UserRole.SchoolAdmin, auth!.LoginRole);
        Assert.Contains(UserRole.SchoolAdmin, auth.Roles);
    }

    [Fact]
    public async Task Login_SameEmailInTwoSchools_ResolvesByPassword()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"shared-{suffix}@example.com";
        var schoolA = new School
        {
            Name = $"School A {suffix}",
            Code = $"school-a-{suffix}",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode($"school-a-{suffix}")
        };
        var schoolB = new School
        {
            Name = $"School B {suffix}",
            Code = $"school-b-{suffix}",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode($"school-b-{suffix}")
        };
        var coachA = TestUsers.Create(schoolA.Id, email, "Coach A", "password-a", UserRole.Coach);
        var coachB = TestUsers.Create(schoolB.Id, email, "Coach B", "password-b", UserRole.Coach);

        await _factory.SeedAsync(db =>
        {
            db.Schools.AddRange(schoolA, schoolB);
            db.Users.AddRange(coachA, coachB);
            return Task.CompletedTask;
        });

        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "password-b",
            mode = LoginMode.Coach,
            deviceName = "test"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(auth);
        Assert.Equal(schoolB.Id, auth!.SchoolId);
    }

    [Fact]
    public async Task Login_SameEmailAndPasswordInTwoSchools_IsUnauthorized()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"ambiguous-{suffix}@example.com";
        var schoolA = new School
        {
            Name = $"Ambiguous A {suffix}",
            Code = $"ambiguous-a-{suffix}",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode($"ambiguous-a-{suffix}")
        };
        var schoolB = new School
        {
            Name = $"Ambiguous B {suffix}",
            Code = $"ambiguous-b-{suffix}",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode($"ambiguous-b-{suffix}")
        };
        var coachA = TestUsers.Create(schoolA.Id, email, "Coach A", "same-password", UserRole.Coach);
        var coachB = TestUsers.Create(schoolB.Id, email, "Coach B", "same-password", UserRole.Coach);

        await _factory.SeedAsync(db =>
        {
            db.Schools.AddRange(schoolA, schoolB);
            db.Users.AddRange(coachA, coachB);
            return Task.CompletedTask;
        });

        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "same-password",
            mode = LoginMode.Coach,
            deviceName = "test"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
