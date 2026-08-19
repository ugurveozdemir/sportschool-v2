using Microsoft.AspNetCore.Diagnostics;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Audit;
using Sportschool.Api.Security;

namespace Sportschool.Api.Infrastructure;

public static class ApiPipelineExtensions
{
    private static readonly HashSet<string> MutationMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Post,
        HttpMethods.Put,
        HttpMethods.Patch,
        HttpMethods.Delete
    };

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

    public static IApplicationBuilder UseAuditLogging(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            await next(context);

            if (!ShouldAudit(context.Request))
            {
                return;
            }

            var path = context.Request.Path.Value ?? "/";
            var auditLog = new AuditLog
            {
                UserId = CurrentUser.GetUserId(context.User),
                SchoolId = CurrentUser.GetSchoolId(context.User),
                Method = Truncate(context.Request.Method, maximumLength: 10),
                Path = Truncate(path, maximumLength: 500),
                StatusCode = context.Response.StatusCode,
                CorrelationId = Truncate(context.TraceIdentifier, maximumLength: 100)
            };

            try
            {
                await using var scope = context.RequestServices.GetRequiredService<IServiceScopeFactory>().CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
                db.AuditLogs.Add(auditLog);
                await db.SaveChangesAsync(CancellationToken.None);
            }
            catch (Exception exception)
            {
                var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("AuditLog");
                logger.LogError(exception, "Failed to persist audit log for {Method} {Path}.", auditLog.Method, auditLog.Path);
            }
        });
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
                    "connect-src 'self' https://*.mux.com https://storage.googleapis.com;",
                    "font-src 'self' data:;",
                    "form-action 'self';",
                    "frame-ancestors 'none';",
                    "img-src 'self' data: blob:;",
                    "media-src 'self' https://*.mux.com blob:;",
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

    private static bool ShouldAudit(HttpRequest request)
    {
        if (!request.Path.StartsWithSegments("/api")
            || !MutationMethods.Contains(request.Method))
        {
            return false;
        }

        var path = request.Path.Value ?? string.Empty;
        return path is not "/api/auth/login"
            and not "/api/auth/refresh"
            and not "/api/auth/logout"
            and not "/api/auth/dashboard/login"
            and not "/api/auth/dashboard/refresh"
            and not "/api/auth/dashboard/logout";
    }

    private static string Truncate(string value, int maximumLength) =>
        value.Length <= maximumLength ? value : value[..maximumLength];
}
