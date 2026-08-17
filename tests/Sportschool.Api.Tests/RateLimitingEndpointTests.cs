using System.Net;
using System.Net.Http.Json;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class RateLimitingEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory factory;

    public RateLimitingEndpointTests(TestAppFactory factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task Login_ReturnsTooManyRequestsAfterRepeatedAttemptsForSameAccountAndRole()
    {
        using var client = factory.CreateClient();
        var email = $"rate-limit-{Guid.NewGuid():N}@example.com";

        for (var attempt = 0; attempt < 10; attempt++)
        {
            using var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                email,
                password = "wrong-password",
                mode = LoginMode.SchoolAdmin,
                deviceName = "test"
            });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        using var limitedResponse = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "wrong-password",
            mode = LoginMode.SchoolAdmin,
            deviceName = "test"
        });

        Assert.Equal(HttpStatusCode.TooManyRequests, limitedResponse.StatusCode);
        Assert.True(limitedResponse.Headers.RetryAfter?.Delta > TimeSpan.Zero);
    }

    [Fact]
    public async Task AthleteApplication_ReturnsTooManyRequestsAfterRepeatedMatchingSubmissions()
    {
        using var client = factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N");
        var request = new
        {
            schoolCode = $"missing-{suffix}",
            athleteFirstName = "Rate",
            athleteLastName = "Limited",
            athleteBirthDate = new DateOnly(2012, 1, 1),
            athleteEmail = $"athlete-{suffix}@example.com",
            password = "password",
            parentFullName = "Parent Limited",
            parentPhone = "5551112233",
            parentEmail = $"parent-{suffix}@example.com"
        };

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await client.PostAsJsonAsync("/api/applications/athletes", request);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        using var limitedResponse = await client.PostAsJsonAsync("/api/applications/athletes", request);

        Assert.Equal(HttpStatusCode.TooManyRequests, limitedResponse.StatusCode);
        Assert.True(limitedResponse.Headers.RetryAfter?.Delta > TimeSpan.Zero);
    }
}
