using Sportschool.Api.Features.Groups;

namespace Sportschool.Api.Features.Trainings;

public sealed class TrainingSessionGroup
{
    public Guid TrainingSessionId { get; set; }

    public TrainingSession TrainingSession { get; set; } = null!;

    public Guid GroupId { get; set; }

    public TrainingGroup Group { get; set; } = null!;

    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.UtcNow;
}
