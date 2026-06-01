using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Features.Announcements;

public sealed class Announcement
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SchoolId { get; set; }

    public School School { get; set; } = null!;

    public required string Title { get; set; }

    public required string Content { get; set; }

    public Guid? CreatedByUserId { get; set; }

    public AppUser? CreatedBy { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset PublishedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? ExpiresAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
