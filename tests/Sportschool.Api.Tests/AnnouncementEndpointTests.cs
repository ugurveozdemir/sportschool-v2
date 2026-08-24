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
    public async Task CoachCanReadButCannotManageSchoolAnnouncements()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);
        var request = new SaveAnnouncementRequest("Maç saati değişti", "Cumartesi maçı 15:00 yerine 16:00 başlayacak.", null);

        var announcements = await client.GetFromJsonAsync<AnnouncementResponse[]>("/api/school/announcements");
        using var createResponse = await client.PostAsJsonAsync("/api/school/announcements", request);
        using var updateResponse = await client.PutAsJsonAsync($"/api/school/announcements/{fixture.CurrentAnnouncementId}", request);
        using var deleteResponse = await client.DeleteAsync($"/api/school/announcements/{fixture.CurrentAnnouncementId}");

        Assert.NotNull(announcements);
        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task UnreadCount_ReturnsActiveUnexpiredAnnouncementsForMember()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Parent, UserRole.Parent);

        var response = await client.GetFromJsonAsync<UnreadCountResponse>("/api/me/announcements/unread-count");

        Assert.NotNull(response);
        Assert.Equal(1, response!.Count);
    }

    [Fact]
    public async Task MarkRead_ThenUnreadCountIsZero()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Parent, UserRole.Parent);

        using var readResponse = await client.PostAsync("/api/me/announcements/read", null);
        Assert.Equal(HttpStatusCode.NoContent, readResponse.StatusCode);

        var countResponse = await client.GetFromJsonAsync<UnreadCountResponse>("/api/me/announcements/unread-count");
        Assert.NotNull(countResponse);
        Assert.Equal(0, countResponse!.Count);
    }

    [Fact]
    public async Task SchoolStaffUnreadCountIsPerUser()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var coachClient = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);
        using var adminClient = factory.CreateAuthenticatedClient(fixture.Admin, UserRole.SchoolAdmin);

        var coachCount = await coachClient.GetFromJsonAsync<UnreadCountResponse>("/api/school/announcements/unread-count");
        Assert.NotNull(coachCount);
        Assert.Equal(1, coachCount!.Count);

        using var readResponse = await coachClient.PostAsync("/api/school/announcements/read", null);
        Assert.Equal(HttpStatusCode.NoContent, readResponse.StatusCode);

        var coachCountAfterRead = await coachClient.GetFromJsonAsync<UnreadCountResponse>("/api/school/announcements/unread-count");
        var adminCount = await adminClient.GetFromJsonAsync<UnreadCountResponse>("/api/school/announcements/unread-count");
        Assert.Equal(0, coachCountAfterRead!.Count);
        Assert.Equal(1, adminCount!.Count);
    }

    [Fact]
    public async Task MarkRead_IsPerUser_OtherUserStillSeesUnread()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        var secondParent = TestUsers.Create(fixture.School.Id, $"parent2-{Guid.NewGuid():N}@example.com", "Second Parent", "password", UserRole.Parent);
        await factory.SeedAsync(db => { db.Users.Add(secondParent); return Task.CompletedTask; });

        using var parentAClient = factory.CreateAuthenticatedClient(fixture.Parent, UserRole.Parent);
        using var parentBClient = factory.CreateAuthenticatedClient(secondParent, UserRole.Parent);

        using var _ = await parentAClient.PostAsync("/api/me/announcements/read", null);

        var countB = await parentBClient.GetFromJsonAsync<UnreadCountResponse>("/api/me/announcements/unread-count");
        Assert.NotNull(countB);
        Assert.Equal(1, countB!.Count);
    }

    [Fact]
    public async Task MarkRead_IsIdempotent()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Parent, UserRole.Parent);

        using var first = await client.PostAsync("/api/me/announcements/read", null);
        using var second = await client.PostAsync("/api/me/announcements/read", null);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        var count = await client.GetFromJsonAsync<UnreadCountResponse>("/api/me/announcements/unread-count");
        Assert.Equal(0, count!.Count);
    }

    [Fact]
    public async Task UnreadCount_OnlyCountsOwnSchool()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.OtherParent, UserRole.Parent);

        var response = await client.GetFromJsonAsync<UnreadCountResponse>("/api/me/announcements/unread-count");

        Assert.NotNull(response);
        Assert.Equal(1, response!.Count);
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

    [Fact]
    public async Task SchoolAdminAnnouncement_StoresExpirationAsUtc()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedAnnouncementScenarioAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Admin, UserRole.SchoolAdmin);
        var expiresAtUtc = DateTimeOffset.UtcNow.AddDays(1);
        var request = new SaveAnnouncementRequest(
            "UTC duyurusu",
            "Yerel saat ofseti veritabanına UTC olarak kaydedilir.",
            expiresAtUtc.ToOffset(TimeSpan.FromHours(3)));

        using var response = await client.PostAsJsonAsync("/api/school/announcements", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var storedExpiresAt = await factory.QueryAsync(db => db.Announcements
            .Where(x => x.Title == request.Title)
            .Select(x => x.ExpiresAt)
            .SingleAsync());
        Assert.NotNull(storedExpiresAt);
        Assert.Equal(TimeSpan.Zero, storedExpiresAt.Value.Offset);
        Assert.Equal(expiresAtUtc, storedExpiresAt.Value);
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
