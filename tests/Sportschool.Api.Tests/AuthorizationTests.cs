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
}
