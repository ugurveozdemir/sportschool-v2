using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Athletes;

public sealed class AthleteProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public DateOnly BirthDate { get; set; }

    public required string ParentFullName { get; set; }

    public required string ParentPhone { get; set; }

    public Guid? ParentUserId { get; set; }

    public AppUser? Parent { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Per-athlete monthly fee that overrides the school-wide default. Null means the athlete
    /// is billed at <see cref="Schools.School.DefaultMonthlyFee"/>.
    /// </summary>
    public decimal? MonthlyFeeOverride { get; set; }

    public string? ProfileImageStorageKey { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
