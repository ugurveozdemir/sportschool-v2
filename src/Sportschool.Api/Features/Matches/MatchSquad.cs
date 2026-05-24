using Sportschool.Api.Features.Athletes;

namespace Sportschool.Api.Features.Matches;

public sealed class MatchSquad
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid MatchSessionId { get; set; }

    public MatchSession MatchSession { get; set; } = null!;

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public MatchSquadStatus Status { get; set; } = MatchSquadStatus.FirstEleven;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum MatchSquadStatus
{
    FirstEleven = 1,
    Substitute = 2,
    NotSelected = 3
}
