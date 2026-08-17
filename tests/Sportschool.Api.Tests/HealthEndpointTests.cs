using System.Net;
using System.Net.Http.Json;
using Sportschool.Api.Features.Health;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class HealthEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public HealthEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/health/live")]
    public async Task LiveHealthEndpoints_ReturnOk(string path)
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.Equal("ok", health?.Status);
    }

    [Fact]
    public async Task ReadyHealthEndpoint_ReturnsOkWhenDatabaseIsAvailable()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.Equal("ready", health?.Status);
    }

    [Fact]
    public async Task UnknownApiRoute_ReturnsNotFoundInsteadOfDashboardHtml()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/unknown-route");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotEqual("text/html", response.Content.Headers.ContentType?.MediaType);
    }
}
