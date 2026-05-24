using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Applications;

public sealed class AthleteApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public required string AthleteFirstName { get; set; }

    public required string AthleteLastName { get; set; }

    public DateOnly AthleteBirthDate { get; set; }

    public required string AthleteEmail { get; set; }

    public required string NormalizedAthleteEmail { get; set; }

    public required string PasswordHash { get; set; }

    public required string ParentFullName { get; set; }

    public required string ParentPhone { get; set; }

    public required string ParentEmail { get; set; }

    public required string NormalizedParentEmail { get; set; }

    public AthleteApplicationStatus Status { get; set; } = AthleteApplicationStatus.Pending;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? DecidedAt { get; set; }

    public Guid? ApprovedUserId { get; set; }

    public AppUser? ApprovedUser { get; set; }
}
