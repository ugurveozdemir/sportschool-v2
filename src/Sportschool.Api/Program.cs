using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Http.Features;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Announcements;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Bootstrap;
using Sportschool.Api.Features.Dashboard;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Mobile;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Platform;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.SchoolManagement;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Security;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<DevSeedOptions>(builder.Configuration.GetSection(DevSeedOptions.SectionName));
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(x => !string.IsNullOrWhiteSpace(x.Issuer), "JWT issuer is required.")
    .Validate(x => !string.IsNullOrWhiteSpace(x.Audience), "JWT audience is required.")
    .Validate(x => x.SigningKey.Length >= 32, "JWT signing key must be at least 32 characters.")
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
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<RefreshTokenService>();
builder.Services.AddSingleton<TemporaryPasswordGenerator>();
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = 100 * 1024 * 1024);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 100 * 1024 * 1024);
builder.Services.AddSingleton<IMediaStorage, LocalMediaStorage>();
builder.Services.AddSingleton<MediaAccessUrlService>();
builder.Services.AddHostedService<DevSeedHostedService>();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("JWT options are not configured.");

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
                if (schoolId is null)
                {
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<SportschoolDbContext>();
                var schoolIsActive = await db.Schools.AnyAsync(
                    school => school.Id == schoolId.Value && school.IsActive,
                    context.HttpContext.RequestAborted);

                if (!schoolIsActive)
                {
                    context.Fail("School is inactive.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
    app.MapBootstrapEndpoints();
}

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }))
    .WithName("GetHealth");
app.MapMethods("/favicon.ico", [HttpMethods.Get, HttpMethods.Head], () => Results.Redirect("/dashboard/favicon.svg"));
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
app.MapFallbackToFile("/dashboard/{*path:nonfile}", "dashboard/index.html");

app.Run();

public partial class Program;
