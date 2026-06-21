using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Platform;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class BootstrapPlatformFlowTests : IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly TestAppFactory _factory = new();

    [Fact]
    public async Task BootstrapLoginAndCreateSchoolAdminFlow_Succeeds()
    {
        using var client = _factory.CreateClient();

        using var bootstrapResponse = await client.PostAsJsonAsync("/api/bootstrap/platform-owner", new
        {
            email = "owner@example.com",
            fullName = "Platform Owner",
            password = "owner-password"
        });
        Assert.Equal(HttpStatusCode.Created, bootstrapResponse.StatusCode);

        using var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new
        {
            schoolCode = (string?)null,
            email = "owner@example.com",
            password = "owner-password",
            mode = "PlatformOwner",
            deviceName = "integration-test"
        });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(auth);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        using var schoolResponse = await client.PostAsJsonAsync("/api/platform/schools", new
        {
            name = "Demo School",
            code = "demo"
        });
        Assert.Equal(HttpStatusCode.Created, schoolResponse.StatusCode);
        var school = await schoolResponse.Content.ReadFromJsonAsync<SchoolResponse>(JsonOptions);
        Assert.NotNull(school);

        using var adminResponse = await client.PostAsJsonAsync($"/api/platform/schools/{school!.Id}/admins", new
        {
            email = "admin@example.com",
            fullName = "School Admin"
        });
        Assert.Equal(HttpStatusCode.Created, adminResponse.StatusCode);
        var admin = await adminResponse.Content.ReadFromJsonAsync<SchoolAdminResponse>(JsonOptions);
        Assert.NotNull(admin);
        Assert.Equal(12, admin!.TemporaryPassword.Length);

        var hasSchoolAdminRole = await _factory.QueryAsync(db =>
            db.UserRoles.AnyAsync(x => x.UserId == admin.Id && x.Role == UserRole.SchoolAdmin));
        Assert.True(hasSchoolAdminRole);

        var hasCoachRole = await _factory.QueryAsync(db =>
            db.UserRoles.AnyAsync(x => x.UserId == admin.Id && x.Role == UserRole.Coach));
        Assert.True(hasCoachRole);
    }

    public Task InitializeAsync()
    {
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
    }
}
