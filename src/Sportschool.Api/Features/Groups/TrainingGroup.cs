using Sportschool.Api.Features.Schools;

namespace Sportschool.Api.Features.Groups;

public sealed class TrainingGroup
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public required string Name { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<GroupAthlete> Athletes { get; } = [];
}
