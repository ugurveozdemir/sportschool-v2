using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Tests.Infrastructure;

public sealed class TestAppFactory : WebApplicationFactory<Program>
{
    public const string MuxWebhookSecret = "test-mux-webhook-secret";

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly string _mediaPath = Path.Combine(Path.GetTempPath(), "sportschool-api-tests", Guid.NewGuid().ToString("N"));

    public FakeMuxVideoClient Mux { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Application:TimeZone", "UTC");
        builder.UseSetting("Jwt:SigningKey", JwtOptions.DevelopmentSigningKey);
        builder.UseSetting("Media:LocalStoragePath", _mediaPath);
        builder.UseSetting("Mux:Enabled", "true");
        builder.UseSetting("Mux:TokenId", "test-token-id");
        builder.UseSetting("Mux:TokenSecret", "test-token-secret");
        builder.UseSetting("Mux:WebhookSigningSecret", MuxWebhookSecret);
        builder.UseSetting("Mux:PlaybackSigningKeyId", "test-signing-key-id");
        builder.UseSetting("Mux:PlaybackSigningPrivateKey", "dGVzdA==");
        builder.UseSetting("Mux:UploadOrigin", "http://localhost");
        builder.ConfigureServices(services =>
        {
            _connection.Open();
            services.RemoveAll<DbContextOptions<SportschoolDbContext>>();
            services.AddDbContext<SportschoolDbContext>(options => options.UseSqlite(_connection));
            services.RemoveAll<IMuxVideoClient>();
            services.AddSingleton<IMuxVideoClient>(Mux);
            services.RemoveAll<IMuxPlaybackUrlService>();
            services.AddSingleton<IMuxPlaybackUrlService, FakeMuxPlaybackUrlService>();

            var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
            db.Database.EnsureCreated();
        });
    }

    public HttpClient CreateAuthenticatedClient(AppUser user, UserRole loginRole)
    {
        var client = CreateClient();
        var tokenService = Services.GetRequiredService<JwtTokenService>();
        var token = tokenService.CreateAccessToken(user, loginRole);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        return client;
    }

    public async Task SeedAsync(Func<SportschoolDbContext, Task> seed)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
        await seed(db);
        await db.SaveChangesAsync();
    }

    public async Task<T> QueryAsync<T>(Func<SportschoolDbContext, Task<T>> query)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
        return await query(db);
    }

    public override async ValueTask DisposeAsync()
    {
        await _connection.DisposeAsync();
        if (Directory.Exists(_mediaPath))
        {
            Directory.Delete(_mediaPath, recursive: true);
        }
        await base.DisposeAsync();
    }
}
