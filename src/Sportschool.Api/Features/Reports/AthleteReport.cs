using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Reports;

public sealed class AthleteReport
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public Guid CoachId { get; set; }

    public AppUser Coach { get; set; } = null!;

    public required string Summary { get; set; }

    public required string ImprovementAreas { get; set; }

    public decimal SpeedScore { get; set; }

    public decimal StrengthScore { get; set; }

    public decimal DribblingScore { get; set; }

    public decimal ShootingScore { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; set; }
}
