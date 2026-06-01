using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Announcements;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class AnnouncementEndpointTests
{
    [Fact]
    public async Task ParentCanReadCurrentAndExpiredSchoolAnnouncements()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Parent, UserRole.Parent);

        var allAnnouncements = await client.GetFromJsonAsync<AnnouncementResponse[]>("/api/me/announcements");
        var currentAnnouncements = await client.GetFromJsonAsync<AnnouncementResponse[]>("/api/me/announcements?currentOnly=true");

        Assert.NotNull(allAnnouncements);
        Assert.NotNull(currentAnnouncements);
        Assert.Equal(new[] { fixture.CurrentAnnouncementId, fixture.ExpiredAnnouncementId }, allAnnouncements!.Select(x => x.Id).ToArray());
        var current = Assert.Single(currentAnnouncements!);
        Assert.Equal(fixture.CurrentAnnouncementId, current.Id);
        Assert.True(current.IsNew);
        Assert.False(current.IsExpired);
        Assert.Contains(allAnnouncements, x => x.Id == fixture.ExpiredAnnouncementId && x is { IsExpired: true, IsNew: false });
    }

    [Fact]
    public async Task AnnouncementsStayInsideCurrentSchool()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.OtherParent, UserRole.Parent);

        var announcements = await client.GetFromJsonAsync<AnnouncementResponse[]>("/api/me/announcements");

        Assert.NotNull(announcements);
        var announcement = Assert.Single(announcements!);
        Assert.Equal(fixture.OtherSchoolAnnouncementId, announcement.Id);
    }

    [Fact]
    public async Task CoachCanCreateAnnouncementForOwnSchool()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);
        var request = new SaveAnnouncementRequest("Maç saati değişti", "Cumartesi maçı 15:00 yerine 16:00 başlayacak.", null);

        using var response = await client.PostAsJsonAsync("/api/school/announcements", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AnnouncementResponse>();
        Assert.NotNull(body);
        Assert.Equal(fixture.Coach.Id, body.CreatedByUserId);
        Assert.True(body.IsNew);
        var saved = await factory.QueryAsync(db => db.Announcements.SingleAsync(x => x.Id == body.Id));
        Assert.Equal(fixture.School.Id, saved.SchoolId);
        Assert.Equal(fixture.Coach.Id, saved.CreatedByUserId);
    }

    [Fact]
    public async Task CoachCanOnlyUpdateOwnAnnouncement()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var coachClient = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);
        using var otherCoachClient = factory.CreateAuthenticatedClient(fixture.OtherCoachSameSchool, UserRole.Coach);
        var request = new SaveAnnouncementRequest("Güncellenen başlık", "Güncellenen duyuru içeriği.", null);

        using var forbiddenResponse = await otherCoachClient.PutAsJsonAsync($"/api/school/announcements/{fixture.CurrentAnnouncementId}", request);
        using var successResponse = await coachClient.PutAsJsonAsync($"/api/school/announcements/{fixture.CurrentAnnouncementId}", request);

        Assert.Equal(HttpStatusCode.NotFound, forbiddenResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, successResponse.StatusCode);
        var title = await factory.QueryAsync(db => db.Announcements
            .Where(x => x.Id == fixture.CurrentAnnouncementId)
            .Select(x => x.Title)
            .SingleAsync());
        Assert.Equal("Güncellenen başlık", title);
    }

    [Fact]
    public async Task SchoolAdminCanDeactivateAnySchoolAnnouncement()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Admin, UserRole.SchoolAdmin);

        using var response = await client.DeleteAsync($"/api/school/announcements/{fixture.CurrentAnnouncementId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var isActive = await factory.QueryAsync(db => db.Announcements
            .Where(x => x.Id == fixture.CurrentAnnouncementId)
            .Select(x => x.IsActive)
            .SingleAsync());
        Assert.False(isActive);
    }

    private static async Task<AnnouncementFixture> SeedAnnouncementScenarioAsync(TestAppFactory factory)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var school = CreateSchool($"Announcement School {suffix}", $"ann-{suffix}");
        var otherSchool = CreateSchool($"Other Announcement School {suffix}", $"ann-other-{suffix}");
        var coach = TestUsers.Create(school.Id, $"coach-{suffix}@example.com", "Coach User", "password", UserRole.Coach);
        var otherCoachSameSchool = TestUsers.Create(school.Id, $"other-coach-{suffix}@example.com", "Other Coach", "password", UserRole.Coach);
        var admin = TestUsers.Create(school.Id, $"admin-{suffix}@example.com", "Admin User", "password", UserRole.SchoolAdmin);
        var parent = TestUsers.Create(school.Id, $"parent-{suffix}@example.com", "Parent User", "password", UserRole.Parent);
        var otherParent = TestUsers.Create(otherSchool.Id, $"other-parent-{suffix}@example.com", "Other Parent", "password", UserRole.Parent);
        var otherCoach = TestUsers.Create(otherSchool.Id, $"other-school-coach-{suffix}@example.com", "Other School Coach", "password", UserRole.Coach);
        var now = DateTimeOffset.UtcNow;
        var currentAnnouncementId = Guid.NewGuid();
        var expiredAnnouncementId = Guid.NewGuid();
        var otherSchoolAnnouncementId = Guid.NewGuid();

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(school, otherSchool);
            db.Users.AddRange(coach, otherCoachSameSchool, admin, parent, otherParent, otherCoach);
            db.Announcements.AddRange(
                new Announcement
                {
                    Id = currentAnnouncementId,
                    SchoolId = school.Id,
                    CreatedByUserId = coach.Id,
                    Title = "Yeni antrenman planı",
                    Content = "Bu haftanın antrenman planı yayınlandı.",
                    PublishedAt = now.AddDays(-1),
                    CreatedAt = now.AddDays(-1)
                },
                new Announcement
                {
                    Id = expiredAnnouncementId,
                    SchoolId = school.Id,
                    CreatedByUserId = admin.Id,
                    Title = "Eski kamp duyurusu",
                    Content = "Kamp kayıtları tamamlandı.",
                    PublishedAt = now.AddDays(-10),
                    ExpiresAt = now.AddDays(-1),
                    CreatedAt = now.AddDays(-10)
                },
                new Announcement
                {
                    Id = otherSchoolAnnouncementId,
                    SchoolId = otherSchool.Id,
                    CreatedByUserId = otherCoach.Id,
                    Title = "Başka okul duyurusu",
                    Content = "Bu duyuru başka okula aittir.",
                    PublishedAt = now.AddDays(-1),
                    CreatedAt = now.AddDays(-1)
                });
            return Task.CompletedTask;
        });

        return new AnnouncementFixture(
            school,
            coach,
            otherCoachSameSchool,
            admin,
            parent,
            otherParent,
            currentAnnouncementId,
            expiredAnnouncementId,
            otherSchoolAnnouncementId);
    }

    private static School CreateSchool(string name, string code)
    {
        return new School
        {
            Name = name,
            Code = code,
            NormalizedCode = TextNormalizer.NormalizeSchoolCode(code)
        };
    }

    private sealed record AnnouncementFixture(
        School School,
        AppUser Coach,
        AppUser OtherCoachSameSchool,
        AppUser Admin,
        AppUser Parent,
        AppUser OtherParent,
        Guid CurrentAnnouncementId,
        Guid ExpiredAnnouncementId,
        Guid OtherSchoolAnnouncementId);
}
