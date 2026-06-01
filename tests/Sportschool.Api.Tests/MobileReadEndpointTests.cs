using System.Net;
using System.Net.Http.Json;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class MobileReadEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public MobileReadEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Profile_AllowsParentLinkedToAthleteProfile()
    {
        var school = new School
        {
            Name = "Demo School",
            Code = "demo",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode("demo")
        };
        var parent = TestUsers.Create(school.Id, "parent@example.com", "Parent User", "password", UserRole.Parent);
        var athlete = TestUsers.Create(school.Id, "athlete@example.com", "Ada Yilmaz", "password", UserRole.Athlete);

        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(school);
            db.Users.AddRange(parent, athlete);
            db.AthleteProfiles.Add(new AthleteProfile
            {
                SchoolId = school.Id,
                User = athlete,
                Parent = parent,
                FirstName = "Ada",
                LastName = "Yilmaz",
                BirthDate = new DateOnly(2012, 5, 10),
                ParentFullName = "Parent User",
                ParentPhone = "+905551112233"
            });

            return Task.CompletedTask;
        });

        using var client = _factory.CreateAuthenticatedClient(parent, UserRole.Parent);

        using var response = await client.GetAsync("/api/me/profile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<MobileProfileResponse>();
        Assert.NotNull(profile);
        Assert.Equal("Ada", profile.FirstName);
    }

    [Fact]
    public async Task Athletes_ListsParentLinkedAthleteProfiles()
    {
        var school = new School
        {
            Name = "Selection School",
            Code = "selection",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode("selection")
        };
        var parent = TestUsers.Create(school.Id, "selection-parent@example.com", "Selection Parent", "password", UserRole.Parent);
        var athleteA = TestUsers.Create(school.Id, "selection-athlete-a@example.com", "Ada Yilmaz", "password", UserRole.Athlete);
        var athleteB = TestUsers.Create(school.Id, "selection-athlete-b@example.com", "Bora Demir", "password", UserRole.Athlete);
        var profileA = new AthleteProfile
        {
            SchoolId = school.Id,
            User = athleteA,
            Parent = parent,
            FirstName = "Ada",
            LastName = "Yilmaz",
            BirthDate = new DateOnly(2012, 5, 10),
            ParentFullName = "Selection Parent",
            ParentPhone = "+905551112233"
        };
        var profileB = new AthleteProfile
        {
            SchoolId = school.Id,
            User = athleteB,
            Parent = parent,
            FirstName = "Bora",
            LastName = "Demir",
            BirthDate = new DateOnly(2014, 3, 7),
            ParentFullName = "Selection Parent",
            ParentPhone = "+905551112233"
        };

        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(school);
            db.Users.AddRange(parent, athleteA, athleteB);
            db.AthleteProfiles.AddRange(profileA, profileB);

            return Task.CompletedTask;
        });

        using var client = _factory.CreateAuthenticatedClient(parent, UserRole.Parent);

        var athletes = await client.GetFromJsonAsync<List<MobileAthleteResponse>>("/api/me/athletes");
        var selectedProfile = await client.GetFromJsonAsync<MobileProfileResponse>($"/api/me/profile?athleteProfileId={profileB.Id}");

        Assert.Equal(["Ada", "Bora"], athletes!.Select(x => x.FirstName).ToArray());
        Assert.NotNull(selectedProfile);
        Assert.Equal("Bora", selectedProfile.FirstName);
    }

    [Fact]
    public async Task AthleteReports_AllowsParentLinkedToAthleteProfile()
    {
        var school = new School
        {
            Name = "Report School",
            Code = "reports",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode("reports")
        };
        var parent = TestUsers.Create(school.Id, "report-parent@example.com", "Report Parent", "password", UserRole.Parent);
        var athlete = TestUsers.Create(school.Id, "report-athlete@example.com", "Ada Yilmaz", "password", UserRole.Athlete);
        var coach = TestUsers.Create(school.Id, "report-coach@example.com", "Coach User", "password", UserRole.Coach);
        var profile = new AthleteProfile
        {
            SchoolId = school.Id,
            User = athlete,
            Parent = parent,
            FirstName = "Ada",
            LastName = "Yilmaz",
            BirthDate = new DateOnly(2012, 5, 10),
            ParentFullName = "Report Parent",
            ParentPhone = "+905551112233"
        };

        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(school);
            db.Users.AddRange(parent, athlete, coach);
            db.AthleteProfiles.Add(profile);
            db.AthleteReports.Add(new AthleteReport
            {
                SchoolId = school.Id,
                AthleteProfile = profile,
                Coach = coach,
                Summary = "Good progress",
                ImprovementAreas = "First touch",
                SpeedScore = 7,
                StrengthScore = 8,
                DribblingScore = 8,
                ShootingScore = 7
            });

            return Task.CompletedTask;
        });

        using var client = _factory.CreateAuthenticatedClient(parent, UserRole.Parent);

        var reports = await client.GetFromJsonAsync<List<AthleteReportResponse>>("/api/me/athlete-reports");

        var report = Assert.Single(reports!);
        Assert.Equal(profile.Id, report.AthleteProfileId);
    }

    private sealed record MobileAthleteResponse(Guid Id, string FirstName, string LastName);

    private sealed record MobileProfileResponse(string FirstName, string LastName);

    private sealed record AthleteReportResponse(Guid AthleteProfileId, string Summary);
}
