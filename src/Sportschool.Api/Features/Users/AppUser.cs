using Sportschool.Api.Features.Schools;

namespace Sportschool.Api.Features.Users;

public sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? SchoolId { get; set; }

    public School? School { get; set; }

    public required string Email { get; set; }

    public required string NormalizedEmail { get; set; }

    public required string FullName { get; set; }

    public required string PasswordHash { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<UserRoleAssignment> Roles { get; } = [];
}
