using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Media;

public sealed class AthleteVideo
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public Guid AthleteProfileId { get; set; }

    public AthleteProfile AthleteProfile { get; set; } = null!;

    public Guid UploadedByUserId { get; set; }

    public AppUser UploadedBy { get; set; } = null!;

    public string? StorageKey { get; set; }

    public string? MuxUploadId { get; set; }

    public string? MuxAssetId { get; set; }

    public string? MuxPlaybackId { get; set; }

    public string? Caption { get; set; }

    public AthleteVideoStatus Status { get; set; } = AthleteVideoStatus.Ready;

    public bool IsPublished { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? PublishedAt { get; set; }
}
