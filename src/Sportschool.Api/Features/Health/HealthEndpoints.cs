using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;

namespace Sportschool.Api.Features.Health;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", Live).WithName("GetHealth");
        app.MapGet("/api/health/live", Live).WithName("GetLiveness");
        app.MapGet("/api/health/ready", ReadyAsync).WithName("GetReadiness");
        return app;
    }

    private static IResult Live() => Results.Ok(new HealthResponse("ok"));

    private static async Task<IResult> ReadyAsync(
        SportschoolDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        try
        {
            return await db.Database.CanConnectAsync(cancellationToken)
                ? Results.Ok(new HealthResponse("ready"))
                : ServiceUnavailable();
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            loggerFactory.CreateLogger("DatabaseReadiness")
                .LogWarning(exception, "Database readiness check failed.");
            return ServiceUnavailable();
        }
    }

    private static IResult ServiceUnavailable() => Results.Json(
        new HealthResponse("unavailable"),
        statusCode: StatusCodes.Status503ServiceUnavailable);
}

public sealed record HealthResponse(string Status);
