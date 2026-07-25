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
        using var content = CreateUpload("image", "avatar.png", "image/png", [137, 80, 78, 71]);

        var response = await client.PutAsync($"/api/school/athletes/{athlete.Id}/profile-image", content);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ProfileImageResponse>(JsonOptions);
        Assert.NotNull(result);
        Assert.Equal(athlete.Id, result.AthleteProfileId);
        Assert.StartsWith("/media/profile-images/", result.Url);

        var updatedAthlete = await factory.QueryAsync(db => db.AthleteProfiles.SingleAsync(x => x.Id == athlete.Id));
        Assert.NotNull(updatedAthlete.ProfileImageStorageKey);
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
        using var upload = CreateUpload("video", "training.mp4", "video/mp4", [0, 0, 0, 24, 102, 116, 121, 112]);
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
}
