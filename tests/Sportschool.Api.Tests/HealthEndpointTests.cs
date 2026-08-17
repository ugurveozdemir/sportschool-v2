using System.Net;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class HealthEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public HealthEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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
