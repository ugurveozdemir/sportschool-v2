using Microsoft.AspNetCore.Diagnostics;

namespace Sportschool.Api.Infrastructure;

public static class ApiPipelineExtensions
{
    public static IApplicationBuilder UseRequestCorrelation(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            var correlationId = context.TraceIdentifier;
            context.Response.Headers["X-Correlation-ID"] = correlationId;

            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
                .CreateLogger("RequestCorrelation");
            using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
            {
                await next(context);
            }
        });
    }

    public static IApplicationBuilder UseSafeExceptionResponses(this IApplicationBuilder app)
    {
        return app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
                .CreateLogger("UnhandledException");
            logger.LogError(exception, "Unhandled request error.");

            await Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An unexpected error occurred.",
                extensions: new Dictionary<string, object?>
                {
                    ["correlationId"] = context.TraceIdentifier
                }).ExecuteAsync(context);
        }));
    }

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;
                headers["Content-Security-Policy"] = string.Join(' ',
                    "default-src 'self';",
                    "base-uri 'self';",
                    "connect-src 'self';",
                    "font-src 'self' data:;",
                    "form-action 'self';",
                    "frame-ancestors 'none';",
                    "img-src 'self' data: blob:;",
                    "media-src 'self' blob:;",
                    "object-src 'none';",
                    "script-src 'self';",
                    "style-src 'self' 'unsafe-inline';");
                headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()";
                headers["Referrer-Policy"] = "no-referrer";
                headers["X-Content-Type-Options"] = "nosniff";
                headers["X-Frame-Options"] = "DENY";
                return Task.CompletedTask;
            });

            await next(context);
        });
    }
}
