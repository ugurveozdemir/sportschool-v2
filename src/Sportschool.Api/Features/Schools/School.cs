using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Schools;

public sealed class School
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string Name { get; set; }

    public required string Code { get; set; }

    public required string NormalizedCode { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<AppUser> Users { get; } = [];
}
