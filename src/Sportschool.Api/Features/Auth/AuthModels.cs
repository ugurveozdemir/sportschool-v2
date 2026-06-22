using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Auth;

public enum LoginMode
{
    PlatformOwner = 1,
    SchoolAdmin = 2,
    Coach = 3,
    Parent = 4,
    Athlete = 5
}

public sealed record LoginRequest(
    string Email,
    string Password,
    LoginMode Mode,
    string? DeviceName);

public sealed record LoginSchoolResponse(string Name, string Code);

public sealed record RefreshRequest(string RefreshToken);

public sealed record LogoutRequest(string RefreshToken);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    Guid UserId,
    Guid? SchoolId,
    string Email,
    string FullName,
    UserRole[] Roles)
{
    public static AuthResponse From(AppUser user, IssuedAccessToken accessToken, string refreshToken)
    {
        return new AuthResponse(
            accessToken.Token,
            accessToken.ExpiresAt,
            refreshToken,
            user.Id,
            user.SchoolId,
            user.Email,
            user.FullName,
            user.Roles.Select(x => x.Role).Order().ToArray());
    }
}

public static class LoginModeExtensions
{
    public static UserRole ToUserRole(this LoginMode mode)
    {
        return mode switch
        {
            LoginMode.PlatformOwner => UserRole.PlatformOwner,
            LoginMode.SchoolAdmin => UserRole.SchoolAdmin,
            LoginMode.Coach => UserRole.Coach,
            LoginMode.Parent => UserRole.Parent,
            LoginMode.Athlete => UserRole.Athlete,
            _ => throw new ArgumentOutOfRangeException(nameof(mode), mode, "Unsupported login mode.")
        };
    }
}
