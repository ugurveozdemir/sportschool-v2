using Sportschool.Api.Features.Athletes;

namespace Sportschool.Api.Features.Groups;

public sealed class GroupAthlete
{
    public Guid GroupId { get; set; }

    public TrainingGroup Group { get; set; } = null!;

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.UtcNow;
}
