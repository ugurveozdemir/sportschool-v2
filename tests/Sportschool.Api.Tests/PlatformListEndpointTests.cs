using System.Net;
using System.Net.Http.Json;
using Sportschool.Api.Features.Platform;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class PlatformListEndpointTests
{
    [Fact]
    public async Task PlatformOwnerCanListSchoolsAndSchoolAdmins()
    {
        await using var factory = new TestAppFactory();
        var platformOwner = TestUsers.Create(null, "platform-list@example.com", "Platform Owner", "password", UserRole.PlatformOwner);
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var adminA = TestUsers.Create(schoolAId, "admin-platform-a@example.com", "Admin A", "password", UserRole.SchoolAdmin);
        var coachA = TestUsers.Create(schoolAId, "coach-platform-a@example.com", "Coach A", "password", UserRole.Coach);
        var adminB = TestUsers.Create(schoolBId, "admin-platform-b@example.com", "Admin B", "password", UserRole.SchoolAdmin);

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(
                CreateSchool(schoolAId, "Tenant A", "platform-a", isActive: true),
                CreateSchool(schoolBId, "Tenant B", "platform-b", isActive: false));
            db.Users.AddRange(platformOwner, adminA, coachA, adminB);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(platformOwner, UserRole.PlatformOwner);

        var schools = await client.GetFromJsonAsync<List<SchoolResponse>>("/api/platform/schools");
        var admins = await client.GetFromJsonAsync<List<PlatformSchoolAdminResponse>>($"/api/platform/schools/{schoolAId}/admins");

        Assert.Equal(2, schools!.Count);
        Assert.Contains(schools, school => school.Id == schoolBId && !school.IsActive);

        var admin = Assert.Single(admins!);
        Assert.Equal(adminA.Id, admin.Id);
        Assert.Equal(schoolAId, admin.SchoolId);
    }

    [Fact]
    public async Task PlatformOwnerAdminList_ReturnsNotFoundForMissingSchool()
    {
        await using var factory = new TestAppFactory();
        var platformOwner = TestUsers.Create(null, "platform-missing-school@example.com", "Platform Owner", "password", UserRole.PlatformOwner);

        await factory.SeedAsync(db =>
        {
            db.Users.Add(platformOwner);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(platformOwner, UserRole.PlatformOwner);

        using var response = await client.GetAsync($"/api/platform/schools/{Guid.NewGuid()}/admins");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PlatformOwnerCanListSchools_WithSearchFilter()
    {
        await using var factory = new TestAppFactory();
        var platformOwner = TestUsers.Create(null, "platform-search@example.com", "Platform Owner", "password", UserRole.PlatformOwner);
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(
                CreateSchool(schoolAId, "Ankara Basketbol", "ank-1", isActive: true),
                CreateSchool(schoolBId, "Izmir Basketbol", "izm-1", isActive: true));
            db.Users.Add(platformOwner);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(platformOwner, UserRole.PlatformOwner);

        // Search for 'ankara'
        var schools = await client.GetFromJsonAsync<List<SchoolResponse>>("/api/platform/schools?search=ankara");
        var school = Assert.Single(schools!);
        Assert.Equal("Ankara Basketbol", school.Name);

        // Search for 'izm' (matches code/name)
        var izmSchools = await client.GetFromJsonAsync<List<SchoolResponse>>("/api/platform/schools?search=izm-1");
        var izmSchool = Assert.Single(izmSchools!);
        Assert.Equal("Izmir Basketbol", izmSchool.Name);
    }

    private static School CreateSchool(Guid id, string name, string code, bool isActive)
    {
        return new School
        {
            Id = id,
            Name = name,
            Code = code,
            NormalizedCode = TextNormalizer.NormalizeSchoolCode(code),
            IsActive = isActive
        };
    }
}
