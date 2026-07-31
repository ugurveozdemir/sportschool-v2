using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Reports;

/// <summary>
/// The coach's evaluation for one athlete at one completed training.
/// </summary>
public sealed class TrainingAthleteReport
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public Guid TrainingSessionId { get; set; }

    public TrainingSession TrainingSession { get; set; } = null!;

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public Guid CoachId { get; set; }

    public AppUser Coach { get; set; } = null!;

    public decimal NutritionScore { get; set; }

    public decimal CognitiveDevelopmentScore { get; set; }

    public decimal DisciplineScore { get; set; }

    public decimal PhysicalConditionScore { get; set; }

    public decimal PsychologicalDevelopmentScore { get; set; }

    public decimal TacticalDevelopmentScore { get; set; }

    public decimal TechnicalDevelopmentScore { get; set; }

    public string? CoachNote { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; set; }
}
