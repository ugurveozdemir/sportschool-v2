using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Auth;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", LoginAsync);
        group.MapPost("/refresh", RefreshAsync);
        group.MapPost("/logout", LogoutAsync);

        return group;
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.BadRequest();
        }

        var role = request.Mode.ToUserRole();
        var normalizedEmail = TextNormalizer.NormalizeEmail(request.Email);
        var user = await FindLoginUserAsync(db, request, role, normalizedEmail, cancellationToken);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Results.Unauthorized();
        }

        var accessToken = jwtTokenService.CreateAccessToken(user, role);
        var refreshToken = refreshTokenService.CreateToken(user.Id, role, request.DeviceName);
        db.RefreshTokens.Add(refreshToken.Entity);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AuthResponse.From(user, accessToken, refreshToken.PlainTextToken));
    }

    private static async Task<IResult> RefreshAsync(
        RefreshRequest request,
        SportschoolDbContext db,
        JwtTokenService jwtTokenService,
        RefreshTokenService refreshTokenService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Results.BadRequest();
        }

        var tokenHash = refreshTokenService.HashToken(request.RefreshToken);
        var storedToken = await db.RefreshTokens
            .Include(x => x.User)
            .ThenInclude(x => x.Roles)
            .Include(x => x.User)
            .ThenInclude(x => x.School)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (storedToken is null || !storedToken.IsActive || !storedToken.User.IsActive)
        {
            return Results.Unauthorized();
        }

        if (!storedToken.User.Roles.Any(x => x.Role == storedToken.Role))
        {
            return Results.Unauthorized();
        }

        var accessToken = jwtTokenService.CreateAccessToken(storedToken.User, storedToken.Role);
        var refreshToken = refreshTokenService.CreateToken(storedToken.UserId, storedToken.Role, storedToken.DeviceName);

        storedToken.RevokedAt = DateTimeOffset.UtcNow;
        storedToken.ReplacedByTokenHash = refreshToken.Entity.TokenHash;
        db.RefreshTokens.Add(refreshToken.Entity);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AuthResponse.From(storedToken.User, accessToken, refreshToken.PlainTextToken));
    }

    private static async Task<IResult> LogoutAsync(
        [FromBody] LogoutRequest request,
        SportschoolDbContext db,
        RefreshTokenService refreshTokenService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Results.BadRequest();
        }

        var tokenHash = refreshTokenService.HashToken(request.RefreshToken);
        var storedToken = await db.RefreshTokens
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (storedToken is not null && storedToken.IsActive)
        {
            storedToken.RevokedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        return Results.NoContent();
    }

    private static Task<AppUser?> FindLoginUserAsync(
        SportschoolDbContext db,
        LoginRequest request,
        UserRole role,
        string normalizedEmail,
        CancellationToken cancellationToken)
    {
        var users = db.Users
            .Include(x => x.Roles)
            .Include(x => x.School)
            .Where(x => x.IsActive && x.NormalizedEmail == normalizedEmail);

        if (role == UserRole.PlatformOwner)
        {
            return users.FirstOrDefaultAsync(
                x => x.SchoolId == null && x.Roles.Any(roleAssignment => roleAssignment.Role == role),
                cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(request.SchoolCode))
        {
            return Task.FromResult<AppUser?>(null);
        }

        var normalizedSchoolCode = TextNormalizer.NormalizeSchoolCode(request.SchoolCode);

        return users.FirstOrDefaultAsync(
            x => x.School != null
                && x.School.IsActive
                && x.School.NormalizedCode == normalizedSchoolCode
                && x.Roles.Any(roleAssignment => roleAssignment.Role == role),
            cancellationToken);
    }
}
