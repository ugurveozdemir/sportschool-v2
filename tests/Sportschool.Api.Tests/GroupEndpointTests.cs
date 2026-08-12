using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class GroupEndpointTests
{
    [Fact]
    public async Task SchoolAdminCanSearchGroupsAndSeeRosterAndUpcomingTrainingSummaries()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-group-summary@example.com", "Admin", "password", UserRole.SchoolAdmin);
        var athleteUser = TestUsers.Create(schoolId, "athlete-group-summary@example.com", "Athlete", "password", UserRole.Athlete);
        var athlete = new AthleteProfile
        {
            SchoolId = schoolId,
            User = athleteUser,
            FirstName = "Deniz",
            LastName = "Kaya",
            BirthDate = new DateOnly(2013, 1, 1),
            ParentFullName = "Veli Kaya",
            ParentPhone = "555"
        };
        var group = new TrainingGroup { SchoolId = schoolId, Name = "Başlangıç grubu" };
        var otherGroup = new TrainingGroup { SchoolId = schoolId, Name = "İleri seviye" };
        var upcomingTraining = new TrainingSession
        {
            SchoolId = schoolId,
            CoachId = admin.Id,
            Title = "Yaklaşan antrenman",
            StartsAt = DateTimeOffset.UtcNow.AddDays(1),
            EndsAt = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Groups = { new TrainingSessionGroup { Group = group } }
        };
        var alreadyStartedTraining = new TrainingSession
        {
            SchoolId = schoolId,
            CoachId = admin.Id,
            Title = "Başlamış antrenman",
            StartsAt = DateTimeOffset.UtcNow.AddHours(-1),
            EndsAt = DateTimeOffset.UtcNow.AddHours(1),
            StartedAt = DateTimeOffset.UtcNow.AddHours(-1),
            StartedByUserId = admin.Id,
            Groups = { new TrainingSessionGroup { Group = group } }
        };

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(new School
            {
                Id = schoolId,
                Name = "Group Summary School",
                Code = "group-summary-school",
                NormalizedCode = TextNormalizer.NormalizeSchoolCode("group-summary-school")
            });
            db.Users.AddRange(admin, athleteUser);
            db.AthleteProfiles.Add(athlete);
            db.TrainingGroups.AddRange(group, otherGroup);
            db.GroupAthletes.Add(new GroupAthlete { Group = group, AthleteProfile = athlete });
            db.TrainingSessions.AddRange(upcomingTraining, alreadyStartedTraining);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);

        var groups = await client.GetFromJsonAsync<GroupResponse[]>("/api/school/groups?search=Başlangıç");

        var summary = Assert.Single(groups!);
        Assert.Equal(group.Id, summary.Id);
        Assert.Equal(1, summary.AthleteCount);
        Assert.Equal(1, summary.UpcomingTrainingCount);
    }

    [Fact]
    public async Task SchoolAdminCanManageGroupAndAthleteRoster()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-group@example.com", "Admin", "password", UserRole.SchoolAdmin);
        var athleteUser = TestUsers.Create(schoolId, "athlete-group@example.com", "Athlete", "password", UserRole.Athlete);
        var athlete = new AthleteProfile
        {
            SchoolId = schoolId,
            User = athleteUser,
            FirstName = "Ali",
            LastName = "Veli",
            BirthDate = new DateOnly(2013, 1, 1),
            ParentFullName = "Parent User",
            ParentPhone = "555"
        };

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(new School
            {
                Id = schoolId,
                Name = "Group School",
                Code = "group-school",
                NormalizedCode = TextNormalizer.NormalizeSchoolCode("group-school")
            });
            db.Users.AddRange(admin, athleteUser);
            db.AthleteProfiles.Add(athlete);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        using var createResponse = await client.PostAsJsonAsync("/api/school/groups", new CreateGroupRequest("U12", "Hafta sonu grubu"));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var group = await createResponse.Content.ReadFromJsonAsync<GroupResponse>();
        Assert.NotNull(group);

        using var addResponse = await client.PostAsync($"/api/school/groups/{group!.Id}/athletes/{athlete.Id}", null);
        Assert.Equal(HttpStatusCode.NoContent, addResponse.StatusCode);
        var roster = await client.GetFromJsonAsync<GroupAthleteResponse[]>($"/api/school/groups/{group.Id}/athletes");
        var member = Assert.Single(roster!);
        Assert.Equal(athlete.Id, member.Id);

        using var updateResponse = await client.PutAsJsonAsync($"/api/school/groups/{group.Id}", new UpdateGroupRequest("U13", "Yeni açıklama"));
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using var removeResponse = await client.DeleteAsync($"/api/school/groups/{group.Id}/athletes/{athlete.Id}");
        Assert.Equal(HttpStatusCode.NoContent, removeResponse.StatusCode);
        var membershipCount = await factory.QueryAsync(db => db.GroupAthletes.CountAsync(x => x.GroupId == group.Id));
        Assert.Equal(0, membershipCount);

        using var deactivateResponse = await client.DeleteAsync($"/api/school/groups/{group.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deactivateResponse.StatusCode);
        var isActive = await factory.QueryAsync(db => db.TrainingGroups.Where(x => x.Id == group.Id).Select(x => x.IsActive).SingleAsync());
        Assert.False(isActive);
    }
}
