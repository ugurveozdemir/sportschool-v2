using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Sportschool.Api.Features.Athletes;
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
