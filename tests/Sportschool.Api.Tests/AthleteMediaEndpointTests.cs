using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class AthleteMediaEndpointTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task SchoolAdminCanUploadProfileImageForCurrentSchoolAthlete()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "media-admin@example.com", "Media Admin", "password", UserRole.SchoolAdmin);
        var athleteUser = TestUsers.Create(schoolId, "media-athlete@example.com", "Media Athlete", "password", UserRole.Athlete);
        var athlete = CreateAthlete(schoolId, athleteUser, "Ada", "Yilmaz");

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Media School", "media-school"));
            db.Users.AddRange(admin, athleteUser);
            db.AthleteProfiles.Add(athlete);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        using var content = CreateUpload("image", "avatar.png", "image/png", [137, 80, 78, 71, 13, 10, 26, 10]);

        var response = await client.PutAsync($"/api/school/athletes/{athlete.Id}/profile-image", content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ProfileImageResponse>(JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(athlete.Id, result.AthleteProfileId);
        Assert.StartsWith($"/api/media/profile-images/{athlete.Id}?token=", result.Url);
        Assert.Contains("&v=", result.Url);

        using var mediaClient = factory.CreateClient();
        using var mediaResponse = await mediaClient.GetAsync(result.Url);
        Assert.Equal(HttpStatusCode.OK, mediaResponse.StatusCode);
        Assert.Equal("image/png", mediaResponse.Content.Headers.ContentType?.MediaType);

        var updatedAthlete = await factory.QueryAsync(db => db.AthleteProfiles.SingleAsync(x => x.Id == athlete.Id));
        Assert.NotNull(updatedAthlete.ProfileImageStorageKey);
        Assert.NotNull(updatedAthlete.ProfileImageVersion);
    }

    [Fact]
    public async Task CoachCannotUploadProfileImage()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "media-coach@example.com", "Media Coach", "password", UserRole.Coach);
        var athleteUser = TestUsers.Create(schoolId, "media-athlete-2@example.com", "Media Athlete", "password", UserRole.Athlete);
        var athlete = CreateAthlete(schoolId, athleteUser, "Bora", "Yilmaz");

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Media School", "media-school-2"));
            db.Users.AddRange(coach, athleteUser);
            db.AthleteProfiles.Add(athlete);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);
        using var content = CreateUpload("image", "avatar.jpg", "image/jpeg", [1, 2, 3]);

        var response = await client.PutAsync($"/api/school/athletes/{athlete.Id}/profile-image", content);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ProfileImageRejectsSpoofedContentType()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "media-admin-validation@example.com", "Media Admin", "password", UserRole.SchoolAdmin);
        var athleteUser = TestUsers.Create(schoolId, "media-athlete-validation@example.com", "Media Athlete", "password", UserRole.Athlete);
        var athlete = CreateAthlete(schoolId, athleteUser, "Ece", "Yilmaz");

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Media School", "media-validation"));
            db.Users.AddRange(admin, athleteUser);
            db.AthleteProfiles.Add(athlete);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        using var content = CreateUpload("image", "payload.html", "image/jpeg", "<script>alert(1)</script>"u8.ToArray());

        var response = await client.PutAsync($"/api/school/athletes/{athlete.Id}/profile-image", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SchoolAdminCanUploadMp4WhenBrowserUsesGenericMimeType()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "media-safari-admin@example.com", "Media Safari Admin", "password", UserRole.SchoolAdmin);
        var athleteUser = TestUsers.Create(schoolId, "media-safari-athlete@example.com", "Media Safari Athlete", "password", UserRole.Athlete);
        var athlete = CreateAthlete(schoolId, athleteUser, "Gul", "Yilmaz");

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Media Safari School", "media-safari"));
            db.Users.AddRange(admin, athleteUser);
            db.AthleteProfiles.Add(athlete);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        using var upload = CreateUpload("video", "training.mp4", "application/octet-stream", [0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);

        var response = await client.PostAsync($"/api/school/athlete-videos?athleteProfileId={athlete.Id}", upload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task PublishedVideoAppearsOnlyInCurrentSchoolFeed()
    {
        await using var factory = new TestAppFactory();
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var adminA = TestUsers.Create(schoolAId, "media-admin-a@example.com", "Admin A", "password", UserRole.SchoolAdmin);
        var athleteAUser = TestUsers.Create(schoolAId, "media-athlete-a@example.com", "Athlete A", "password", UserRole.Athlete);
        var athleteBUser = TestUsers.Create(schoolBId, "media-athlete-b@example.com", "Athlete B", "password", UserRole.Athlete);
        var athleteA = CreateAthlete(schoolAId, athleteAUser, "Cem", "A");
        var athleteB = CreateAthlete(schoolBId, athleteBUser, "Deniz", "B");

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(
                CreateSchool(schoolAId, "School A", "media-a"),
                CreateSchool(schoolBId, "School B", "media-b"));
            db.Users.AddRange(adminA, athleteAUser, athleteBUser);
            db.AthleteProfiles.AddRange(athleteA, athleteB);
            return Task.CompletedTask;
        });

        using var adminClient = factory.CreateAuthenticatedClient(adminA, UserRole.SchoolAdmin);
        using var upload = CreateUpload("video", "training.mp4", "video/mp4", [0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);
        var uploadResponse = await adminClient.PostAsync(
            $"/api/school/athlete-videos?athleteProfileId={athleteA.Id}&caption=Great%20training",
            upload);
        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);
        var video = await uploadResponse.Content.ReadFromJsonAsync<AthleteVideoResponse>(JsonOptions);
        Assert.NotNull(video);

        var publishResponse = await adminClient.PatchAsJsonAsync(
            $"/api/school/athlete-videos/{video.Id}/publication",
            new SetVideoPublicationRequest(true));
        Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);

        using var athleteAClient = factory.CreateAuthenticatedClient(athleteAUser, UserRole.Athlete);
        var schoolAFeed = await athleteAClient.GetFromJsonAsync<AthleteFeedResponse>("/api/feed", JsonOptions);
        var schoolAVideo = Assert.Single(schoolAFeed!.Items);
        Assert.Equal(video.Id, schoolAVideo.Id);
        Assert.Equal(athleteA.Id, schoolAVideo.AthleteProfileId);

        using var athleteBClient = factory.CreateAuthenticatedClient(athleteBUser, UserRole.Athlete);
        var schoolBFeed = await athleteBClient.GetFromJsonAsync<AthleteFeedResponse>("/api/feed", JsonOptions);
        Assert.Empty(schoolBFeed!.Items);
    }

    [Fact]
    public async Task FeedCursorDoesNotSkipVideosPublishedAtTheSameTime()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var athleteUser = TestUsers.Create(schoolId, "media-cursor-athlete@example.com", "Media Athlete", "password", UserRole.Athlete);
        var athlete = CreateAthlete(schoolId, athleteUser, "Fikri", "Yilmaz");
        var publishedAt = new DateTimeOffset(2026, 7, 25, 12, 0, 0, TimeSpan.Zero);
        var videos = new[]
        {
            CreatePublishedVideo("00000000-0000-0000-0000-000000000001", schoolId, athlete.Id, athleteUser.Id, publishedAt),
            CreatePublishedVideo("00000000-0000-0000-0000-000000000002", schoolId, athlete.Id, athleteUser.Id, publishedAt),
            CreatePublishedVideo("00000000-0000-0000-0000-000000000003", schoolId, athlete.Id, athleteUser.Id, publishedAt)
        };

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Media School", "media-cursor"));
            db.Users.Add(athleteUser);
            db.AthleteProfiles.Add(athlete);
            db.AthleteVideos.AddRange(videos);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(athleteUser, UserRole.Athlete);
        var firstPage = await client.GetFromJsonAsync<AthleteFeedResponse>("/api/feed?pageSize=1", JsonOptions);
        Assert.NotNull(firstPage);
        Assert.NotNull(firstPage.NextBefore);
        Assert.NotNull(firstPage.NextBeforeId);

        var secondPage = await client.GetFromJsonAsync<AthleteFeedResponse>(
            $"/api/feed?pageSize=1&before={Uri.EscapeDataString(firstPage.NextBefore.Value.ToString("O"))}&beforeId={firstPage.NextBeforeId}",
            JsonOptions);
        Assert.NotNull(secondPage);
        Assert.NotEqual(firstPage.Items[0].Id, secondPage.Items[0].Id);
        Assert.NotNull(secondPage.NextBefore);
        Assert.NotNull(secondPage.NextBeforeId);

        var thirdPage = await client.GetFromJsonAsync<AthleteFeedResponse>(
            $"/api/feed?pageSize=1&before={Uri.EscapeDataString(secondPage.NextBefore.Value.ToString("O"))}&beforeId={secondPage.NextBeforeId}",
            JsonOptions);
        Assert.NotNull(thirdPage);
        Assert.NotEqual(firstPage.Items[0].Id, thirdPage.Items[0].Id);
        Assert.NotEqual(secondPage.Items[0].Id, thirdPage.Items[0].Id);
    }

    private static MultipartFormDataContent CreateUpload(string fieldName, string fileName, string contentType, byte[] bytes)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(file, fieldName, fileName);
        return content;
    }

    private static School CreateSchool(Guid id, string name, string code) => new()
    {
        Id = id,
        Name = name,
        Code = code,
        NormalizedCode = code.ToUpperInvariant()
    };

    private static AthleteProfile CreateAthlete(Guid schoolId, AppUser user, string firstName, string lastName) => new()
    {
        SchoolId = schoolId,
        UserId = user.Id,
        FirstName = firstName,
        LastName = lastName,
        BirthDate = new DateOnly(2015, 1, 1),
        ParentFullName = "Parent",
        ParentPhone = "5550000000"
    };

    private static AthleteVideo CreatePublishedVideo(string id, Guid schoolId, Guid athleteProfileId, Guid uploadedByUserId, DateTimeOffset publishedAt) => new()
    {
        Id = Guid.Parse(id),
        SchoolId = schoolId,
        AthleteProfileId = athleteProfileId,
        UploadedByUserId = uploadedByUserId,
        StorageKey = $"athlete-videos/{Guid.NewGuid():N}.mp4",
        Status = AthleteVideoStatus.Ready,
        IsPublished = true,
        PublishedAt = publishedAt,
        CreatedAt = publishedAt
    };
}
