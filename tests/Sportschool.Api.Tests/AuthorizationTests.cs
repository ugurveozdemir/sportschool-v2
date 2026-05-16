using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Sportschool.Api.Tests;

public sealed class AuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthorizationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PlatformEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/platform/schools", new
        {
            name = "Demo School",
            code = "demo"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SchoolManagementEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/school/coaches", new
        {
            email = "coach@example.com",
            fullName = "Coach User"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GroupEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/school/groups", new
        {
            name = "U12",
            description = "Under 12"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TrainingEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/school/trainings", new
        {
            groupId = Guid.NewGuid(),
            title = "Training",
            startsAt = DateTimeOffset.UtcNow,
            endsAt = DateTimeOffset.UtcNow.AddHours(1),
            recurrence = "None"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ReportEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/school/athlete-reports", new
        {
            athleteProfileId = Guid.NewGuid(),
            summary = "Good progress",
            improvementAreas = "Finishing",
            speedScore = 7.5m,
            strengthScore = 7m,
            dribblingScore = 8m,
            shootingScore = 6.5m
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AttendanceEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync($"/api/school/trainings/{Guid.NewGuid()}/attendance", new
        {
            athleteProfileId = Guid.NewGuid(),
            status = "Present"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PaymentEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PutAsJsonAsync($"/api/school/athletes/{Guid.NewGuid()}/payments/2026/5", new
        {
            amount = 1200m,
            status = "Paid"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MobileReadEndpoints_RequireAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/me/profile");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_RequiresAuthentication()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/auth/change-password", new
        {
            currentPassword = "old-password",
            newPassword = "new-password"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
