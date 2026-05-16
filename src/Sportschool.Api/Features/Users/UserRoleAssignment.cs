namespace Sportschool.Api.Features.Users;

public sealed class UserRoleAssignment
{
    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public UserRole Role { get; set; }
}
