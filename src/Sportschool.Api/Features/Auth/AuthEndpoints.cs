using System.Security.Claims;
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

        group.MapGet("/schools", ListLoginSchoolsAsync);
        group.MapPost("/login", LoginAsync);
        group.MapPost("/refresh", RefreshAsync);
        group.MapPost("/logout", LogoutAsync);
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
            .Select(x => new LoginSchoolResponse(x.Name, x.Code))
            .ToListAsync(cancellationToken);

        return Results.Ok(schools);
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

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword)
            || string.IsNullOrWhiteSpace(request.NewPassword)
            || request.NewPassword.Length < 8)
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

        if (user is null || !passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return Results.Unauthorized();
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
