using Sportschool.Api.Features.Schools;

namespace Sportschool.Api.Features.Matches;

public sealed class MatchSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public required string OpponentTeamName { get; set; }

    public DateTimeOffset MatchDate { get; set; }

    public required string Location { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; set; }

    public List<MatchSquad> Squad { get; } = [];
}
