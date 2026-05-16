using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Bootstrap;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Mobile;
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
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<RefreshTokenService>();
builder.Services.AddSingleton<TemporaryPasswordGenerator>();

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
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
    app.MapBootstrapEndpoints();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }))
    .WithName("GetHealth");
app.MapAuthEndpoints();
app.MapAthleteApplicationEndpoints();
app.MapGroupEndpoints();
app.MapMobileReadEndpoints();
app.MapPaymentEndpoints();
app.MapPlatformEndpoints();
app.MapTrainingEndpoints();
app.MapAthleteReportEndpoints();
app.MapAttendanceEndpoints();
app.MapSchoolManagementEndpoints();

app.Run();

public partial class Program;
