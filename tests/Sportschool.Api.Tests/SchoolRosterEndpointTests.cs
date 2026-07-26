using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.SchoolManagement;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class SchoolRosterEndpointTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task SchoolAdminCanListCurrentSchoolUsersAndCoaches()
    {
        await using var factory = new TestAppFactory();
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var adminA = TestUsers.Create(schoolAId, "admin-roster-a@example.com", "Admin A", "password", UserRole.SchoolAdmin);
        var coachA = TestUsers.Create(schoolAId, "coach-roster-a@example.com", "Coach A", "password", UserRole.Coach);
        var adminB = TestUsers.Create(schoolBId, "admin-roster-b@example.com", "Admin B", "password", UserRole.SchoolAdmin);

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(CreateSchool(schoolAId, "Tenant A", "roster-a"), CreateSchool(schoolBId, "Tenant B", "roster-b"));
            db.Users.AddRange(adminA, coachA, adminB);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(adminA, UserRole.SchoolAdmin);

        var users = await client.GetFromJsonAsync<List<SchoolUserResponse>>("/api/school/users", JsonOptions);
        var coaches = await client.GetFromJsonAsync<List<SchoolUserResponse>>("/api/school/coaches", JsonOptions);

        Assert.Equal(2, users!.Count);
        Assert.All(users, user => Assert.Equal(schoolAId, user.SchoolId));
        var coach = Assert.Single(coaches!);
        Assert.Equal(coachA.Id, coach.Id);
        Assert.Contains(UserRole.Coach, coach.Roles);
    }

    [Fact]
    public async Task CoachCanListOnlyCurrentSchoolAthletes()
    {
        await using var factory = new TestAppFactory();
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var coachA = TestUsers.Create(schoolAId, "coach-athletes-a@example.com", "Coach A", "password", UserRole.Coach);
        var athleteA = TestUsers.Create(schoolAId, "athlete-roster-a@example.com", "Athlete A", "password", UserRole.Athlete, UserRole.Parent);
        var athleteB = TestUsers.Create(schoolBId, "athlete-roster-b@example.com", "Athlete B", "password", UserRole.Athlete, UserRole.Parent);

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(CreateSchool(schoolAId, "Tenant A", "athlete-a"), CreateSchool(schoolBId, "Tenant B", "athlete-b"));
            db.Users.AddRange(coachA, athleteA, athleteB);
            db.AthleteProfiles.AddRange(
                CreateAthleteProfile(schoolAId, athleteA, "Athlete", "A"),
                CreateAthleteProfile(schoolBId, athleteB, "Athlete", "B"));

            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coachA, UserRole.Coach);

        var athletes = await client.GetFromJsonAsync<List<AthleteRosterResponse>>("/api/school/athletes", JsonOptions);

        var athlete = Assert.Single(athletes!);
        Assert.Equal(schoolAId, athlete.SchoolId);
        Assert.Equal(athleteA.Id, athlete.UserId);
    }

    [Fact]
    public async Task DeactivateUser_WorksCorrectly_AndRevokesTokens()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-deact@example.com", "Admin", "password", UserRole.SchoolAdmin);
        var coach = TestUsers.Create(schoolId, "coach-deact@example.com", "Coach", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "deact-1"));
            db.Users.AddRange(admin, coach);

            // Add active refresh token
            db.RefreshTokens.Add(new RefreshToken
            {
                UserId = coach.Id,
                Role = UserRole.Coach,
                TokenHash = "test-hash",
                DeviceName = "Test Device",
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(1)
            });

            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);

        using var response = await client.DeleteAsync($"/api/school/users/{coach.Id}");
        Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);

        // Verify deactivated in DB
        var updatedCoach = await factory.QueryAsync(db => db.Users.Include(x => x.RefreshTokens).SingleAsync(x => x.Id == coach.Id));
        Assert.False(updatedCoach.IsActive);
        var token = Assert.Single(updatedCoach.RefreshTokens);
        Assert.NotNull(token.RevokedAt);
    }

    [Fact]
    public async Task DeactivateUser_SelfDeactivation_Prevented()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-self@example.com", "Admin", "password", UserRole.SchoolAdmin);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "deact-2"));
            db.Users.Add(admin);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);

        using var response = await client.DeleteAsync($"/api/school/users/{admin.Id}");
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SchoolAdminCanDeactivateAthlete_AndRevokesTokens()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-deact-ath@example.com", "Admin", "password", UserRole.SchoolAdmin);
        var athleteUser = TestUsers.Create(schoolId, "ath-deact@example.com", "Ath", "password", UserRole.Athlete);
        var profileId = Guid.NewGuid();

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "deact-3"));
            db.Users.AddRange(admin, athleteUser);

            var profile = CreateAthleteProfile(schoolId, athleteUser, "Ath", "L");
            profile.Id = profileId;
            db.AthleteProfiles.Add(profile);

            db.RefreshTokens.Add(new RefreshToken
            {
                UserId = athleteUser.Id,
                Role = UserRole.Athlete,
                TokenHash = "ath-hash",
                DeviceName = "Test Mobile",
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(1)
            });

            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);

        using var response = await client.DeleteAsync($"/api/school/athletes/{profileId}");
        Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);

        // Verify profile and user deactivated
        var updatedProfile = await factory.QueryAsync(db => db.AthleteProfiles.Include(p => p.User).ThenInclude(u => u.RefreshTokens).SingleAsync(x => x.Id == profileId));
        Assert.False(updatedProfile.IsActive);
        Assert.False(updatedProfile.User.IsActive);
        var token = Assert.Single(updatedProfile.User.RefreshTokens);
        Assert.NotNull(token.RevokedAt);
    }

    [Fact]
    public async Task CoachCannotDeactivateAthleteOrManageGroups()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-restricted@example.com", "Coach", "password", UserRole.Coach);
        var athlete = TestUsers.Create(schoolId, "athlete-restricted@example.com", "Athlete", "password", UserRole.Athlete);
        var athleteProfile = CreateAthleteProfile(schoolId, athlete, "Athlete", "Restricted");
        var group = new TrainingGroup { SchoolId = schoolId, Name = "Group A" };

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "coach-restricted"));
            db.Users.AddRange(coach, athlete);
            db.AthleteProfiles.Add(athleteProfile);
            db.TrainingGroups.Add(group);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);
        using var deactivateResponse = await client.DeleteAsync($"/api/school/athletes/{athleteProfile.Id}");
        using var createGroupResponse = await client.PostAsJsonAsync("/api/school/groups", new CreateGroupRequest("New group", null));
        using var addAthleteResponse = await client.PostAsync($"/api/school/groups/{group.Id}/athletes/{athleteProfile.Id}", null);

        Assert.Equal(System.Net.HttpStatusCode.Forbidden, deactivateResponse.StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, createGroupResponse.StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, addAthleteResponse.StatusCode);
        var isAthleteActive = await factory.QueryAsync(db => db.AthleteProfiles
            .Where(x => x.Id == athleteProfile.Id)
            .Select(x => x.IsActive)
            .SingleAsync());
        Assert.True(isAthleteActive);
    }

    [Fact]
    public async Task DeactivateUser_TenantIsolation_Enforced()
    {
        await using var factory = new TestAppFactory();
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var adminA = TestUsers.Create(schoolAId, "admin-iso-a@example.com", "Admin A", "password", UserRole.SchoolAdmin);
        var coachB = TestUsers.Create(schoolBId, "coach-iso-b@example.com", "Coach B", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(CreateSchool(schoolAId, "School A", "deact-iso-a"), CreateSchool(schoolBId, "School B", "deact-iso-b"));
            db.Users.AddRange(adminA, coachB);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(adminA, UserRole.SchoolAdmin);

        using var response = await client.DeleteAsync($"/api/school/users/{coachB.Id}");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SchoolAdminCanListUsers_WithSearchFilter()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-filter@example.com", "Admin Can", "password", UserRole.SchoolAdmin);
        var coach = TestUsers.Create(schoolId, "coach-filter@example.com", "Veli Demir", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "filter-1"));
            db.Users.AddRange(admin, coach);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);

        // Search for 'can'
        var users = await client.GetFromJsonAsync<List<SchoolUserResponse>>("/api/school/users?search=can", JsonOptions);
        var user = Assert.Single(users!);
        Assert.Equal("Admin Can", user.FullName);

        // Search for 'veli'
        var veliUsers = await client.GetFromJsonAsync<List<SchoolUserResponse>>("/api/school/users?search=veli", JsonOptions);
        var veli = Assert.Single(veliUsers!);
        Assert.Equal("Veli Demir", veli.FullName);
    }

    [Fact]
    public async Task CoachCanListAthletes_WithSearchFilter()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-filter-ath@example.com", "Coach A", "password", UserRole.Coach);
        var athleteA = TestUsers.Create(schoolId, "ath-a@example.com", "Metin Oktay", "password", UserRole.Athlete);
        var athleteB = TestUsers.Create(schoolId, "ath-b@example.com", "Lefter Kucuk", "password", UserRole.Athlete);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "filter-2"));
            db.Users.AddRange(coach, athleteA, athleteB);

            var profileA = CreateAthleteProfile(schoolId, athleteA, "Metin", "Oktay");
            profileA.ParentFullName = "Ahmet Oktay";
            var profileB = CreateAthleteProfile(schoolId, athleteB, "Lefter", "Kucuk");
            profileB.ParentFullName = "Mustafa Kucuk";

            db.AthleteProfiles.AddRange(profileA, profileB);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        // Search by athlete first name 'metin'
        var athletesByName = await client.GetFromJsonAsync<List<AthleteRosterResponse>>("/api/school/athletes?search=metin", JsonOptions);
        var athlete1 = Assert.Single(athletesByName!);
        Assert.Equal("Metin", athlete1.FirstName);

        // Search by parent name 'mustafa'
        var athletesByParent = await client.GetFromJsonAsync<List<AthleteRosterResponse>>("/api/school/athletes?search=mustafa", JsonOptions);
        var athlete2 = Assert.Single(athletesByParent!);
        Assert.Equal("Lefter", athlete2.FirstName);
    }

    private static School CreateSchool(Guid id, string name, string code)
    {
        return new School
        {
            Id = id,
            Name = name,
            Code = code,
            NormalizedCode = TextNormalizer.NormalizeSchoolCode(code)
        };
    }

    private static AthleteProfile CreateAthleteProfile(Guid schoolId, AppUser user, string firstName, string lastName)
    {
        return new AthleteProfile
        {
            SchoolId = schoolId,
            User = user,
            FirstName = firstName,
            LastName = lastName,
            BirthDate = new DateOnly(2012, 1, 1),
            ParentFullName = "Parent User",
            ParentPhone = "555"
        };
    }
}
