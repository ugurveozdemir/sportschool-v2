namespace Sportschool.Api.Features.Audit;

public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? UserId { get; set; }

    public Guid? SchoolId { get; set; }

    public required string Method { get; set; }

    public required string Path { get; set; }

    public int StatusCode { get; set; }

    public required string CorrelationId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
