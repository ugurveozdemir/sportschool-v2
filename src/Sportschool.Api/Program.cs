using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Announcements;
using Sportschool.Api.Features.Audit;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Bootstrap;
using Sportschool.Api.Features.Dashboard;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Health;
using Sportschool.Api.Features.Mobile;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Platform;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.SchoolManagement;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Infrastructure;
using Sportschool.Api.Security;

var migrateOnly = args.Any(argument => string.Equals(argument, "--migrate", StringComparison.OrdinalIgnoreCase));
var provisionPlatformOwner = args.Any(argument => string.Equals(argument, "--provision-platform-owner", StringComparison.OrdinalIgnoreCase));
var resetPlatformOwnerPassword = args.Any(argument => string.Equals(argument, "--reset-platform-owner-password", StringComparison.OrdinalIgnoreCase));
var maintenanceCommandCount = new[] { migrateOnly, provisionPlatformOwner, resetPlatformOwnerPassword }.Count(x => x);
if (maintenanceCommandCount > 1)
{
    throw new InvalidOperationException("Only one maintenance command can be run at a time.");
}

var maintenanceArguments = new[] { "--migrate", "--provision-platform-owner", "--reset-platform-owner-password" };
var appArguments = args
    .Where(argument => !maintenanceArguments.Contains(argument, StringComparer.OrdinalIgnoreCase))
    .ToArray();
var builder = WebApplication.CreateBuilder(appArguments);
var dashboardOrigin = builder.Configuration["Dashboard:Origin"]?.TrimEnd('/');
if (!string.IsNullOrWhiteSpace(dashboardOrigin)
    && (!Uri.TryCreate(dashboardOrigin, UriKind.Absolute, out var dashboardUri)
        || dashboardUri.Scheme != Uri.UriSchemeHttps))
{
    throw new InvalidOperationException("Dashboard origin must be an HTTPS URL.");
}

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
if (!string.IsNullOrWhiteSpace(dashboardOrigin))
{
    builder.Services.AddCors(options => options.AddPolicy("Dashboard", policy => policy
        .WithOrigins(dashboardOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));
}
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<DevSeedOptions>(builder.Configuration.GetSection(DevSeedOptions.SectionName));
builder.Services.AddOptions<MuxOptions>()
    .Bind(builder.Configuration.GetSection(MuxOptions.SectionName))
    .Validate(options => !options.Enabled || options.HasRequiredSettings(), "Mux settings are incomplete or invalid.")
    .ValidateOnStart();
var developmentSigningKeyIsAllowed = builder.Environment.IsDevelopment()
    || builder.Environment.IsEnvironment("Testing");
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(x => !string.IsNullOrWhiteSpace(x.Issuer), "JWT issuer is required.")
    .Validate(x => !string.IsNullOrWhiteSpace(x.Audience), "JWT audience is required.")
    .Validate(x => !string.IsNullOrWhiteSpace(x.SigningKey) && x.SigningKey.Length >= 32, "JWT signing key must be at least 32 characters.")
    .Validate(
        x => developmentSigningKeyIsAllowed || !string.Equals(x.SigningKey, JwtOptions.DevelopmentSigningKey, StringComparison.Ordinal),
        "The development JWT signing key cannot be used outside Development or Testing.")
    .ValidateOnStart();
builder.Services.AddOptions<R2Options>()
    .Bind(builder.Configuration.GetSection(R2Options.SectionName))
    .Validate(
        x => !builder.Environment.IsProduction() || x.IsConfigured,
        "R2 storage must be configured in production.")
    .ValidateOnStart();

if (!builder.Environment.IsEnvironment("Testing"))
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

    builder.Services.AddDbContext<SportschoolDbContext>(options =>
        options.UseNpgsql(connectionString));
}
var applicationTimeZoneId = builder.Configuration["Application:TimeZone"] ?? "Europe/Istanbul";
builder.Services.AddSingleton(TimeZoneInfo.FindSystemTimeZoneById(applicationTimeZoneId));
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<KeyedRequestLimiter>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<RefreshTokenService>();
builder.Services.AddSingleton<TemporaryPasswordGenerator>();
builder.Services.AddScoped<PlatformOwnerMaintenance>();
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = 6 * 1024 * 1024);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 6 * 1024 * 1024);
if (builder.Environment.IsProduction())
{
    builder.Services.AddSingleton<IMediaStorage, R2MediaStorage>();
}
else
{
    builder.Services.AddSingleton<IMediaStorage, LocalMediaStorage>();
}
builder.Services.AddSingleton<MediaAccessUrlService>();
builder.Services.AddSingleton<IMuxPlaybackUrlService, MuxPlaybackUrlService>();
builder.Services.AddSingleton<MuxWebhookVerifier>();
builder.Services.AddHttpClient<IMuxVideoClient, MuxVideoClient>(client =>
    client.BaseAddress = new Uri("https://api.mux.com/video/v1/"));
builder.Services.AddHostedService<DevSeedHostedService>();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("JWT options are not configured.");
if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey))
{
    throw new InvalidOperationException("JWT signing key is not configured.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var schoolId = CurrentUser.GetSchoolId(context.Principal!);
                var userId = CurrentUser.GetUserId(context.Principal!);
                var loginRoleValue = context.Principal!.FindFirst("login_role")?.Value;
                var roleValues = context.Principal.FindAll(ClaimTypes.Role)
                    .Select(claim => claim.Value)
                    .ToArray();
                if (userId is null
                    || !Enum.TryParse<UserRole>(loginRoleValue, out var loginRole)
                    || !Enum.IsDefined(loginRole)
                    || roleValues.Length == 0)
                {
                    context.Fail("Required session claims are missing or invalid.");
                    return;
                }

                var claimedRoles = new HashSet<UserRole>();
                foreach (var roleValue in roleValues)
                {
                    if (!Enum.TryParse<UserRole>(roleValue, out var role) || !Enum.IsDefined(role))
                    {
                        context.Fail("Required session claims are missing or invalid.");
                        return;
                    }

                    claimedRoles.Add(role);
                }

                if (!claimedRoles.Contains(loginRole))
                {
                    context.Fail("Login role is not included in the session roles.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<SportschoolDbContext>();
                var activeClaimedRoleCount = await db.Users
                    .Where(user => user.Id == userId.Value
                        && user.IsActive
                        && (schoolId == null
                            ? user.SchoolId == null
                            : user.SchoolId == schoolId.Value && user.School != null && user.School.IsActive))
                    .SelectMany(user => user.Roles)
                    .CountAsync(
                        roleAssignment => claimedRoles.Contains(roleAssignment.Role),
                        context.HttpContext.RequestAborted);

                if (activeClaimedRoleCount != claimedRoles.Count)
                {
                    context.Fail("User, school, or session roles are no longer active.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (!app.Environment.IsEnvironment("Testing") && (app.Environment.IsDevelopment() || migrateOnly))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
    await db.Database.MigrateAsync();
}

if (migrateOnly)
{
    app.Logger.LogInformation("Database migrations completed successfully.");
    return;
}

if (provisionPlatformOwner || resetPlatformOwnerPassword)
{
    await using var scope = app.Services.CreateAsyncScope();
    var maintenance = scope.ServiceProvider.GetRequiredService<PlatformOwnerMaintenance>();
    var email = app.Configuration["Provisioning:PlatformOwner:Email"];
    var password = app.Configuration["Provisioning:PlatformOwner:Password"];

    if (provisionPlatformOwner)
    {
        var fullName = app.Configuration["Provisioning:PlatformOwner:FullName"];
        var user = await maintenance.ProvisionAsync(email, fullName, password);
        app.Logger.LogInformation("PlatformOwner {Email} was provisioned successfully.", user.Email);
    }
    else
    {
        var user = await maintenance.ResetPasswordAsync(email, password);
        app.Logger.LogInformation("PlatformOwner password was reset and active refresh tokens were revoked for {Email}.", user.Email);
    }

    return;
}

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
    app.MapBootstrapEndpoints();
}

app.UseRequestCorrelation();
app.UseAuditLogging();
app.UseSafeExceptionResponses();
app.UseSecurityHeaders(builder.Configuration["Api:PublicUrl"]);

var webRootPath = app.Environment.WebRootPath
    ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var dashboardRoot = Path.Combine(webRootPath, "dashboard");
if (Directory.Exists(dashboardRoot))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(dashboardRoot)
    });
}

if (!string.IsNullOrWhiteSpace(dashboardOrigin))
{
    app.UseCors("Dashboard");
}

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthEndpoints();
app.MapAuditEndpoints();
app.MapMethods("/favicon.ico", [HttpMethods.Get, HttpMethods.Head], () => Results.Redirect("/favicon.svg"));
app.MapAuthEndpoints();
app.MapAnnouncementEndpoints();
app.MapAthleteApplicationEndpoints();
app.MapGroupEndpoints();
app.MapMobileCoachEndpoints();
app.MapMobileReadEndpoints();
app.MapPaymentEndpoints();
app.MapPlatformEndpoints();
app.MapTrainingEndpoints();
app.MapTrainingLifecycleEndpoints();
app.MapAthleteReportEndpoints();
app.MapTrainingReportEndpoints();
app.MapAttendanceEndpoints();
app.MapSchoolManagementEndpoints();
app.MapDashboardEndpoints();
app.MapAthleteMediaEndpoints();
app.MapMediaAccessEndpoints();
app.MapMuxWebhookEndpoints();
app.MapMethods(
    "/api/{**path}",
    [HttpMethods.Get, HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch, HttpMethods.Delete, HttpMethods.Options, HttpMethods.Head],
    () => Results.NotFound());
app.MapFallbackToFile("/{*path:nonfile}", "dashboard/index.html");

app.Run();

public partial class Program;
