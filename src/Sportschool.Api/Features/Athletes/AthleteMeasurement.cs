namespace Sportschool.Api.Features.Athletes;

public sealed class AthleteMeasurement
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public decimal Height { get; set; }

    public decimal Weight { get; set; }

    public DateOnly RecordedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
