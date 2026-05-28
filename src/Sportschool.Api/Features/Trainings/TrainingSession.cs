using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Trainings;

public sealed class TrainingSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public Guid CoachId { get; set; }

    public AppUser Coach { get; set; } = null!;

    public required string Title { get; set; }

    public DateTimeOffset StartsAt { get; set; }

    public DateTimeOffset EndsAt { get; set; }

    public TrainingRecurrence Recurrence { get; set; } = TrainingRecurrence.None;

    public DateOnly? RecurrenceEndsOn { get; set; }

    public string? Location { get; set; }

    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<TrainingSessionGroup> Groups { get; } = [];
}
