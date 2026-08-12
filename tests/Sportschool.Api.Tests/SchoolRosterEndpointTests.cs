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
    public async Task SchoolAdminCanCreateCoachWithTemporaryPassword()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-create-coach@example.com", "Admin", "password", UserRole.SchoolAdmin);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Create Coach School", "create-coach"));
            db.Users.Add(admin);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        using var response = await client.PostAsJsonAsync(
            "/api/school/coaches",
            new CreateCoachRequest("new-coach@example.com", "New Coach"));

        Assert.Equal(System.Net.HttpStatusCode.Created, response.StatusCode);
        var coach = await response.Content.ReadFromJsonAsync<CoachResponse>(JsonOptions);
        Assert.NotNull(coach);
        Assert.False(string.IsNullOrWhiteSpace(coach.TemporaryPassword));

        var persistedCoach = await factory.QueryAsync(db => db.Users
            .Include(x => x.Roles)
            .SingleAsync(x => x.Id == coach.Id));
        var hasher = new PasswordHasher();
        Assert.True(hasher.Verify(coach.TemporaryPassword!, persistedCoach.PasswordHash));
        Assert.Contains(persistedCoach.Roles, x => x.Role == UserRole.Coach);
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
    public async Task SchoolAdminCanCreateAthletesAndReuseExistingParent()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-create-athlete@example.com", "Admin", "password", UserRole.SchoolAdmin);
        var group = new TrainingGroup { SchoolId = schoolId, Name = "U12" };

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Create Athlete School", "create-athlete"));
            db.Users.Add(admin);
            db.TrainingGroups.Add(group);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        var firstRequest = new CreateAthleteRequest(
            "Ali",
            "Yılmaz",
            new DateOnly(2013, 4, 5),
            "ali@example.com",
            "athlete-pass-1",
            "Ayşe Yılmaz",
            "5551112233",
            "ayse@example.com",
            "parent-pass-1",
            group.Id,
            PreferredFoot.Left);
        var secondRequest = firstRequest with
        {
            FirstName = "Ece",
            AthleteEmail = "ece@example.com",
            AthletePassword = "athlete-pass-2",
            ParentPassword = "ignored-parent-pass"
        };

        using var firstResponse = await client.PostAsJsonAsync("/api/school/athletes", firstRequest);
        using var secondResponse = await client.PostAsJsonAsync("/api/school/athletes", secondRequest);

        Assert.Equal(System.Net.HttpStatusCode.Created, firstResponse.StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.Created, secondResponse.StatusCode);
        var firstAthlete = await firstResponse.Content.ReadFromJsonAsync<AthleteRosterResponse>(JsonOptions);
        var secondAthlete = await secondResponse.Content.ReadFromJsonAsync<AthleteRosterResponse>(JsonOptions);
        Assert.NotNull(firstAthlete);
        Assert.NotNull(secondAthlete);
        Assert.Equal(PreferredFoot.Left, firstAthlete.PreferredFoot);
        Assert.Equal(PreferredFoot.Left, secondAthlete.PreferredFoot);

        var result = await factory.QueryAsync(async db =>
        {
            var profiles = await db.AthleteProfiles
                .Include(x => x.User)
                .Include(x => x.Parent)
                .Where(x => x.SchoolId == schoolId)
                .OrderBy(x => x.FirstName)
                .ToListAsync();
            var parentCount = await db.Users.CountAsync(
                x => x.SchoolId == schoolId && x.NormalizedEmail == TextNormalizer.NormalizeEmail("ayse@example.com"));
            var membershipCount = await db.GroupAthletes.CountAsync(x => x.GroupId == group.Id);
            return new { Profiles = profiles, ParentCount = parentCount, MembershipCount = membershipCount };
        });

        Assert.Equal(2, result.Profiles.Count);
        Assert.Equal(1, result.ParentCount);
        Assert.Equal(2, result.MembershipCount);
        Assert.Equal(result.Profiles[0].ParentUserId, result.Profiles[1].ParentUserId);
        Assert.All(result.Profiles, profile => Assert.Equal(PreferredFoot.Left, profile.PreferredFoot));
        var hasher = new PasswordHasher();
        Assert.True(hasher.Verify("parent-pass-1", result.Profiles[0].Parent!.PasswordHash));
        Assert.Contains(result.Profiles, x => x.User.Email == "ali@example.com" && hasher.Verify("athlete-pass-1", x.User.PasswordHash));
        Assert.Contains(result.Profiles, x => x.User.Email == "ece@example.com" && hasher.Verify("athlete-pass-2", x.User.PasswordHash));
    }

    [Fact]
    public async Task DeactivateCoach_WorksCorrectly_AndRevokesTokens()
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

        using var response = await client.DeleteAsync($"/api/school/coaches/{coach.Id}");
        Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);

        // Verify deactivated in DB
        var updatedCoach = await factory.QueryAsync(db => db.Users.Include(x => x.RefreshTokens).SingleAsync(x => x.Id == coach.Id));
        Assert.False(updatedCoach.IsActive);
        var token = Assert.Single(updatedCoach.RefreshTokens);
        Assert.NotNull(token.RevokedAt);
    }

    [Fact]
    public async Task DeactivateCoach_SelfDeactivation_Prevented()
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

        using var response = await client.DeleteAsync($"/api/school/coaches/{admin.Id}");
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SchoolAdminCannotDeactivateAnotherAdminOrParentThroughCoachEndpoint()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-protect@example.com", "Admin", "password", UserRole.SchoolAdmin, UserRole.Coach);
        var otherAdmin = TestUsers.Create(schoolId, "other-admin-protect@example.com", "Other Admin", "password", UserRole.SchoolAdmin, UserRole.Coach);
        var parent = TestUsers.Create(schoolId, "parent-protect@example.com", "Parent", "password", UserRole.Parent);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "deact-protect"));
            db.Users.AddRange(admin, otherAdmin, parent);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        using var adminResponse = await client.DeleteAsync($"/api/school/coaches/{otherAdmin.Id}");
        using var parentResponse = await client.DeleteAsync($"/api/school/coaches/{parent.Id}");

        Assert.Equal(System.Net.HttpStatusCode.NotFound, adminResponse.StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.NotFound, parentResponse.StatusCode);
        var users = await factory.QueryAsync(db => db.Users
            .Where(x => x.Id == otherAdmin.Id || x.Id == parent.Id)
            .Select(x => new { x.Id, x.IsActive })
            .ToListAsync());
        Assert.All(users, user => Assert.True(user.IsActive));
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
        using var createAthleteResponse = await client.PostAsJsonAsync("/api/school/athletes", new CreateAthleteRequest(
            "New",
            "Athlete",
            new DateOnly(2013, 1, 1),
            "new-athlete@example.com",
            "athlete-password",
            "New Parent",
            "555",
            "new-parent@example.com",
            "parent-password",
            null));
        using var createGroupResponse = await client.PostAsJsonAsync("/api/school/groups", new CreateGroupRequest("New group", null));
        using var addAthleteResponse = await client.PostAsync($"/api/school/groups/{group.Id}/athletes/{athleteProfile.Id}", null);

        Assert.Equal(System.Net.HttpStatusCode.Forbidden, deactivateResponse.StatusCode);
        Assert.Equal(System.Net.HttpStatusCode.Forbidden, createAthleteResponse.StatusCode);
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

        using var response = await client.DeleteAsync($"/api/school/coaches/{coachB.Id}");
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

    [Fact]
    public async Task SchoolAdminCanListAthletes_WithGroupFilterAndPagination()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-group-filter@example.com", "Admin", "password", UserRole.SchoolAdmin);
        var athleteAUser = TestUsers.Create(schoolId, "athlete-group-a@example.com", "Ali A", "password", UserRole.Athlete);
        var athleteBUser = TestUsers.Create(schoolId, "athlete-group-b@example.com", "Bora B", "password", UserRole.Athlete);
        var athleteCUser = TestUsers.Create(schoolId, "athlete-group-c@example.com", "Can C", "password", UserRole.Athlete);
        var underTwelve = new TrainingGroup { SchoolId = schoolId, Name = "U12" };
        var underFourteen = new TrainingGroup { SchoolId = schoolId, Name = "U14" };

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Group Filter School", "group-filter"));
            db.Users.AddRange(admin, athleteAUser, athleteBUser, athleteCUser);

            var athleteA = CreateAthleteProfile(schoolId, athleteAUser, "Ali", "A");
            var athleteB = CreateAthleteProfile(schoolId, athleteBUser, "Bora", "B");
            var athleteC = CreateAthleteProfile(schoolId, athleteCUser, "Can", "C");
            db.AthleteProfiles.AddRange(athleteA, athleteB, athleteC);
            db.TrainingGroups.AddRange(underTwelve, underFourteen);
            db.GroupAthletes.AddRange(
                new GroupAthlete { Group = underTwelve, AthleteProfile = athleteA },
                new GroupAthlete { Group = underTwelve, AthleteProfile = athleteB },
                new GroupAthlete { Group = underFourteen, AthleteProfile = athleteC });
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);

        var result = await client.GetFromJsonAsync<PaginatedList<AthleteRosterResponse>>(
            $"/api/school/athletes?groupId={underTwelve.Id}&page=1&pageSize=1",
            JsonOptions);

        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(1, result.PageSize);
        var firstAthlete = Assert.Single(result.Items);
        var firstGroup = Assert.Single(firstAthlete.Groups);
        Assert.Equal("U12", firstGroup.Name);

        var secondPage = await client.GetFromJsonAsync<PaginatedList<AthleteRosterResponse>>(
            $"/api/school/athletes?groupId={underTwelve.Id}&page=2&pageSize=1",
            JsonOptions);

        Assert.NotNull(secondPage);
        Assert.Equal(2, secondPage.TotalCount);
        Assert.Single(secondPage.Items);
        Assert.NotEqual(firstAthlete.Id, secondPage.Items.Single().Id);
    }

    [Fact]
    public async Task SchoolAdminCanGetAthleteDetailsFromCurrentSchool()
    {
        await using var factory = new TestAppFactory();
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var adminA = TestUsers.Create(schoolAId, "admin-detail-a@example.com", "Admin A", "password", UserRole.SchoolAdmin);
        var athleteAUser = TestUsers.Create(schoolAId, "athlete-detail-a@example.com", "Ali Yılmaz", "password", UserRole.Athlete);
        var parentA = TestUsers.Create(schoolAId, "parent-detail-a@example.com", "Ayşe Yılmaz", "password", UserRole.Parent);
        var athleteBUser = TestUsers.Create(schoolBId, "athlete-detail-b@example.com", "Other Athlete", "password", UserRole.Athlete);
        var athleteA = CreateAthleteProfile(schoolAId, athleteAUser, "Ali", "Yılmaz");
        athleteA.Parent = parentA;
        athleteA.ParentFullName = parentA.FullName;
        athleteA.ParentPhone = "555 111 22 33";
        var athleteB = CreateAthleteProfile(schoolBId, athleteBUser, "Other", "Athlete");
        var group = new TrainingGroup { SchoolId = schoolAId, Name = "U12" };

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(CreateSchool(schoolAId, "Detail School", "detail-a"), CreateSchool(schoolBId, "Other School", "detail-b"));
            db.Users.AddRange(adminA, athleteAUser, parentA, athleteBUser);
            db.AthleteProfiles.AddRange(athleteA, athleteB);
            db.TrainingGroups.Add(group);
            db.GroupAthletes.Add(new GroupAthlete { Group = group, AthleteProfile = athleteA });
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(adminA, UserRole.SchoolAdmin);

        var detail = await client.GetFromJsonAsync<AthleteDetailResponse>($"/api/school/athletes/{athleteA.Id}", JsonOptions);
        using var otherSchoolResponse = await client.GetAsync($"/api/school/athletes/{athleteB.Id}");

        Assert.NotNull(detail);
        Assert.Equal(athleteAUser.Email, detail.Email);
        Assert.Equal(parentA.Email, detail.ParentEmail);
        Assert.Equal("555 111 22 33", detail.ParentPhone);
        var athleteGroup = Assert.Single(detail.Groups);
        Assert.Equal(group.Id, athleteGroup.Id);
        Assert.Equal(group.Name, athleteGroup.Name);
        Assert.Equal(System.Net.HttpStatusCode.NotFound, otherSchoolResponse.StatusCode);
    }

    [Fact]
    public async Task CoachCannotGetSchoolAdminAthleteDetails()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-detail@example.com", "Coach", "password", UserRole.Coach);
        var athleteUser = TestUsers.Create(schoolId, "athlete-detail@example.com", "Athlete", "password", UserRole.Athlete);
        var athlete = CreateAthleteProfile(schoolId, athleteUser, "Detail", "Athlete");

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Detail Access School", "detail-access"));
            db.Users.AddRange(coach, athleteUser);
            db.AthleteProfiles.Add(athlete);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        using var response = await client.GetAsync($"/api/school/athletes/{athlete.Id}");

        Assert.Equal(System.Net.HttpStatusCode.Forbidden, response.StatusCode);
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
