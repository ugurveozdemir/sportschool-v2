using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Announcements;

public sealed class AnnouncementRead
{
    public Guid AnnouncementId { get; set; }

    public Announcement Announcement { get; set; } = null!;

    public Guid UserId { get; set; }

    public AppUser User { get; set; } = null!;

    public DateTimeOffset ReadAt { get; set; } = DateTimeOffset.UtcNow;
}
