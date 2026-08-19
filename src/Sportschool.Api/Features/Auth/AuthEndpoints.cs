using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Auth;

public static class AuthEndpoints
{
    private const string DashboardRefreshCookieName = "sportschool.dashboard.refresh";
    private const int LoginAttemptLimit = 10;
    private const int RefreshAttemptLimit = 10;
    private static readonly TimeSpan LoginAttemptWindow = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan RefreshAttemptWindow = TimeSpan.FromMinutes(5);

    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/schools", ListLoginSchoolsAsync);
        group.MapPost("/login", LoginAsync);
        group.MapPost("/refresh", RefreshAsync);
        group.MapPost("/logout", LogoutAsync);
        group.MapPost("/dashboard/login", DashboardLoginAsync);
        group.MapPost("/dashboard/refresh", DashboardRefreshAsync);
        group.MapPost("/dashboard/logout", DashboardLogoutAsync);
        group.MapPost("/change-password", ChangePasswordAsync).RequireAuthorization();

        return group;
    }

    private static async Task<IResult> ListLoginSchoolsAsync(
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schools = await db.Schools
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Take(RequestValidation.MaxUnpagedItems)
            .Select(x => new LoginSchoolResponse(x.Name, x.Code))
            .ToListAsync(cancellationToken);

        return Results.Ok(schools);
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        HttpContext httpContext,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        KeyedRequestLimiter requestLimiter,
        CancellationToken cancellationToken)
    {
        return await IssueLoginAsync(
            request,
            httpContext,
            db,
            passwordHasher,
            jwtTokenService,
            refreshTokenService,
            requestLimiter,
            (user, accessToken, refreshToken, loginRole) =>
                Results.Ok(AuthResponse.From(user, accessToken, refreshToken.PlainTextToken, loginRole)),
            cancellationToken);
    }

    private static async Task<IResult> DashboardLoginAsync(
        LoginRequest request,
        HttpContext httpContext,
        IHostEnvironment environment,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        KeyedRequestLimiter requestLimiter,
        CancellationToken cancellationToken)
    {
        if (request.Mode is not LoginMode.PlatformOwner and not LoginMode.SchoolAdmin)
        {
            return Results.BadRequest();
        }

        return await IssueLoginAsync(
            request with { DeviceName = "dashboard" },
            httpContext,
            db,
            passwordHasher,
            jwtTokenService,
            refreshTokenService,
            requestLimiter,
            (user, accessToken, refreshToken, loginRole) =>
            {
                SetDashboardRefreshCookie(httpContext, refreshToken, environment);
                return Results.Ok(DashboardAuthResponse.From(user, accessToken, loginRole));
            },
            cancellationToken);
    }

    private static async Task<IResult> IssueLoginAsync(
        LoginRequest request,
        HttpContext httpContext,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        KeyedRequestLimiter requestLimiter,
        Func<AppUser, IssuedAccessToken, IssuedRefreshToken, UserRole, IResult> createResponse,
        CancellationToken cancellationToken)
    {
        if (!RequestValidation.HasValidEmail(request.Email)
            || !RequestValidation.HasValidPassword(request.Password)
            || !RequestValidation.HasOptionalText(request.DeviceName, maximumLength: 120)
            || !Enum.IsDefined(request.Mode))
        {
            return Results.BadRequest();
        }

        var requestedRole = request.Mode.ToUserRole();
        var normalizedEmail = TextNormalizer.NormalizeEmail(request.Email);
        var rateLimitKey = $"login:{request.Mode}:{normalizedEmail}";
        if (!requestLimiter.TryAcquire(rateLimitKey, LoginAttemptLimit, LoginAttemptWindow, out var retryAfterSeconds))
        {
            httpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
            return Results.Json(
                new { message = "Too many login attempts. Please try again later." },
                statusCode: StatusCodes.Status429TooManyRequests);
        }

        var candidates = await FindLoginCandidatesAsync(db, requestedRole, normalizedEmail, cancellationToken);

        // The same email can exist across several schools (email is unique per school),
        // so the password is what resolves which account — and therefore which school — to sign in.
        var matches = candidates
            .Where(candidate => passwordHasher.Verify(request.Password, candidate.PasswordHash))
            .ToList();

        if (matches.Count != 1)
        {
            return Results.Unauthorized();
        }

        var user = matches[0];
        var loginRole = ResolveLoginRole(user, requestedRole);

        var accessToken = jwtTokenService.CreateAccessToken(user, loginRole);
        var refreshToken = refreshTokenService.CreateToken(user.Id, loginRole, request.DeviceName);
        db.RefreshTokens.Add(refreshToken.Entity);
        await db.SaveChangesAsync(cancellationToken);

        return createResponse(user, accessToken, refreshToken, loginRole);
    }

    private static async Task<IResult> RefreshAsync(
        RefreshRequest request,
        HttpContext httpContext,
        SportschoolDbContext db,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        KeyedRequestLimiter requestLimiter,
        CancellationToken cancellationToken)
    {
        return await RotateRefreshTokenAsync(
            request.RefreshToken,
            httpContext,
            db,
            jwtTokenService,
            refreshTokenService,
            requestLimiter,
            (user, accessToken, refreshToken, loginRole) =>
                Results.Ok(AuthResponse.From(user, accessToken, refreshToken.PlainTextToken, loginRole)),
            onRejected: null,
            cancellationToken);
    }

    private static async Task<IResult> DashboardRefreshAsync(
        HttpContext httpContext,
        IHostEnvironment environment,
        SportschoolDbContext db,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        KeyedRequestLimiter requestLimiter,
        CancellationToken cancellationToken)
    {
        var refreshToken = httpContext.Request.Cookies[DashboardRefreshCookieName];
        if (!RequestValidation.HasRequiredText(refreshToken, maximumLength: 500))
        {
            DeleteDashboardRefreshCookie(httpContext, environment);
            return Results.Unauthorized();
        }

        return await RotateRefreshTokenAsync(
            refreshToken!,
            httpContext,
            db,
            jwtTokenService,
            refreshTokenService,
            requestLimiter,
            (user, accessToken, issuedRefreshToken, loginRole) =>
            {
                SetDashboardRefreshCookie(httpContext, issuedRefreshToken, environment);
                return Results.Ok(DashboardAuthResponse.From(user, accessToken, loginRole));
            },
            () => DeleteDashboardRefreshCookie(httpContext, environment),
            cancellationToken);
    }

    private static async Task<IResult> RotateRefreshTokenAsync(
        string refreshTokenValue,
        HttpContext httpContext,
        SportschoolDbContext db,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        KeyedRequestLimiter requestLimiter,
        Func<AppUser, IssuedAccessToken, IssuedRefreshToken, UserRole, IResult> createResponse,
        Action? onRejected,
        CancellationToken cancellationToken)
    {
        if (!RequestValidation.HasRequiredText(refreshTokenValue, maximumLength: 500))
        {
            return Results.BadRequest();
        }

        var tokenHash = refreshTokenService.HashToken(refreshTokenValue);
        var rateLimitKey = $"refresh:{tokenHash}";
        if (!requestLimiter.TryAcquire(rateLimitKey, RefreshAttemptLimit, RefreshAttemptWindow, out var retryAfterSeconds))
        {
            httpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
            return Results.Json(
                new { message = "Too many refresh attempts. Please try again later." },
                statusCode: StatusCodes.Status429TooManyRequests);
        }

        var storedToken = await db.RefreshTokens
            .Include(x => x.User)
            .ThenInclude(x => x.Roles)
            .Include(x => x.User)
            .ThenInclude(x => x.School)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (storedToken is null
            || !storedToken.IsActive
            || !storedToken.User.IsActive
            || (storedToken.User.SchoolId is not null && storedToken.User.School is not { IsActive: true }))
        {
            onRejected?.Invoke();
            return Results.Unauthorized();
        }

        if (!storedToken.User.Roles.Any(x => x.Role == storedToken.Role))
        {
            onRejected?.Invoke();
            return Results.Unauthorized();
        }

        var accessToken = jwtTokenService.CreateAccessToken(storedToken.User, storedToken.Role);
        var refreshToken = refreshTokenService.CreateToken(storedToken.UserId, storedToken.Role, storedToken.DeviceName);

        storedToken.RevokedAt = DateTimeOffset.UtcNow;
        storedToken.ReplacedByTokenHash = refreshToken.Entity.TokenHash;
        db.RefreshTokens.Add(refreshToken.Entity);
        await db.SaveChangesAsync(cancellationToken);

        return createResponse(storedToken.User, accessToken, refreshToken, storedToken.Role);
    }

    private static async Task<IResult> LogoutAsync(
        [FromBody] LogoutRequest request,
        SportschoolDbContext db,
        RefreshTokenService refreshTokenService,
        CancellationToken cancellationToken)
    {
        return await RevokeRefreshTokenAsync(request.RefreshToken, db, refreshTokenService, cancellationToken);
    }

    private static async Task<IResult> DashboardLogoutAsync(
        HttpContext httpContext,
        IHostEnvironment environment,
        SportschoolDbContext db,
        RefreshTokenService refreshTokenService,
        CancellationToken cancellationToken)
    {
        var refreshToken = httpContext.Request.Cookies[DashboardRefreshCookieName];
        DeleteDashboardRefreshCookie(httpContext, environment);
        if (!RequestValidation.HasRequiredText(refreshToken, maximumLength: 500))
        {
            return Results.NoContent();
        }

        return await RevokeRefreshTokenAsync(refreshToken!, db, refreshTokenService, cancellationToken);
    }

    private static async Task<IResult> RevokeRefreshTokenAsync(
        string refreshTokenValue,
        SportschoolDbContext db,
        RefreshTokenService refreshTokenService,
        CancellationToken cancellationToken)
    {
        if (!RequestValidation.HasRequiredText(refreshTokenValue, maximumLength: 500))
        {
            return Results.BadRequest();
        }

        var tokenHash = refreshTokenService.HashToken(refreshTokenValue);
        var storedToken = await db.RefreshTokens
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (storedToken is not null && storedToken.IsActive)
        {
            storedToken.RevokedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        return Results.NoContent();
    }

    private static void SetDashboardRefreshCookie(
        HttpContext httpContext,
        IssuedRefreshToken refreshToken,
        IHostEnvironment environment)
    {
        httpContext.Response.Cookies.Append(
            DashboardRefreshCookieName,
            refreshToken.PlainTextToken,
            DashboardCookieOptions(environment, refreshToken.Entity.ExpiresAt));
    }

    private static void DeleteDashboardRefreshCookie(HttpContext httpContext, IHostEnvironment environment)
    {
        httpContext.Response.Cookies.Delete(
            DashboardRefreshCookieName,
            DashboardCookieOptions(environment, expiresAt: null));
    }

    private static CookieOptions DashboardCookieOptions(IHostEnvironment environment, DateTimeOffset? expiresAt)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment() && !environment.IsEnvironment("Testing"),
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth/dashboard",
            IsEssential = true,
            Expires = expiresAt
        };
    }

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        CancellationToken cancellationToken)
    {
        if (!RequestValidation.HasValidPassword(request.CurrentPassword)
            || !RequestValidation.HasValidPassword(request.NewPassword))
        {
            return Results.BadRequest();
        }

        var userId = CurrentUser.GetUserId(currentUser);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var user = await db.Users
            .Include(x => x.RefreshTokens)
            .FirstOrDefaultAsync(x => x.Id == userId.Value && x.IsActive, cancellationToken);

        if (user is null)
        {
            return Results.Unauthorized();
        }

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return Results.BadRequest(new { message = "Current password is incorrect." });
        }

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var refreshToken in user.RefreshTokens.Where(x => x.IsActive))
        {
            refreshToken.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static Task<List<AppUser>> FindLoginCandidatesAsync(
        SportschoolDbContext db,
        UserRole role,
        string normalizedEmail,
        CancellationToken cancellationToken)
    {
        var users = db.Users
            .Include(x => x.Roles)
            .Include(x => x.School)
            .Where(x => x.IsActive
                && x.NormalizedEmail == normalizedEmail
                && x.Roles.Any(roleAssignment => roleAssignment.Role == role
                    || (role == UserRole.Coach && roleAssignment.Role == UserRole.SchoolAdmin)));

        // PlatformOwner accounts are school-less and globally unique by email;
        // every other role is scoped to an active school.
        users = role == UserRole.PlatformOwner
            ? users.Where(x => x.SchoolId == null)
            : users.Where(x => x.School != null && x.School.IsActive);

        return users.ToListAsync(cancellationToken);
    }

    private static UserRole ResolveLoginRole(AppUser user, UserRole requestedRole)
    {
        // School administrators are also allowed to use coach functions. When they enter
        // through the coach screen, keep the session in its more privileged admin context.
        return requestedRole == UserRole.Coach
            && user.Roles.Any(x => x.Role == UserRole.SchoolAdmin)
            ? UserRole.SchoolAdmin
            : requestedRole;
    }
}
