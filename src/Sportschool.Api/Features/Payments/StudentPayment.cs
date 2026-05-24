using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Payments;

public sealed class StudentPayment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public int Year { get; set; }

    public int Month { get; set; }

    public decimal Amount { get; set; }

    public decimal AmountPaid { get; set; }

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public DateOnly? PaidOn { get; set; }

    public Guid? UpdatedByUserId { get; set; }

    public AppUser? UpdatedBy { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; set; }
}
