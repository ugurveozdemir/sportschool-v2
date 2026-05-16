using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Attendance;

public sealed class AttendanceRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public Guid TrainingSessionId { get; set; }

    public TrainingSession TrainingSession { get; set; } = null!;

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public AttendanceStatus Status { get; set; }

    public Guid RecordedByUserId { get; set; }

    public AppUser RecordedBy { get; set; } = null!;

    public Guid? UpdatedByUserId { get; set; }

    public AppUser? UpdatedBy { get; set; }

    public DateTimeOffset RecordedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; set; }
}
