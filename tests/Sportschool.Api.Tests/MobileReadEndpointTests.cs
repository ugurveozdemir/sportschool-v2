using System.Net;
using System.Net.Http.Json;
using Sportschool.Api.Features.Athletes;
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

    private sealed record MobileProfileResponse(string FirstName, string LastName);
}
