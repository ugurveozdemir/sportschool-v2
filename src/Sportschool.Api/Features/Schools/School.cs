using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Schools;

public sealed class School
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string Name { get; set; }

    public required string Code { get; set; }

    public required string NormalizedCode { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Default monthly fee applied to every athlete that does not have a per-athlete override.
    /// Null until the school configures billing.
    /// </summary>
    public decimal? DefaultMonthlyFee { get; set; }

    /// <summary>
    /// Day of month (1–28) on which the following month's dues become active/payable.
    /// Null means dues activate on the first of their own month.
    /// </summary>
    public int? PaymentDayOfMonth { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<AppUser> Users { get; } = [];
}
