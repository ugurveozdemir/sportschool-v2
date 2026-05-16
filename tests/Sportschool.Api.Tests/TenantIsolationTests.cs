using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class TenantIsolationTests : IAsyncLifetime
{
    private readonly TestAppFactory _factory = new();
    private readonly Guid _schoolAId = Guid.NewGuid();
    private readonly Guid _schoolBId = Guid.NewGuid();
    private readonly AppUser _schoolAdminA;

    public TenantIsolationTests()
    {
        _schoolAdminA = TestUsers.Create(
            _schoolAId,
            "admin-a@example.com",
            "Admin A",
            "password",
            UserRole.SchoolAdmin);
    }

    [Fact]
    public async Task SchoolScopedGroupList_ReturnsOnlyCurrentTenantGroups()
    {
        await SeedSchoolsAndGroupsAsync();
        using var client = _factory.CreateAuthenticatedClient(_schoolAdminA, UserRole.SchoolAdmin);

        var groups = await client.GetFromJsonAsync<List<GroupResponse>>("/api/school/groups");

        var group = Assert.Single(groups!);
        Assert.Equal(_schoolAId, group.SchoolId);
        Assert.Equal("Tenant A Group", group.Name);
    }

    [Fact]
    public async Task SchoolScopedPaymentEndpoint_DoesNotExposeOtherTenantAthlete()
    {
        await SeedSchoolsAndAthletePaymentAsync();
        var otherTenantAthleteId = await _factory.QueryAsync(db =>
            db.AthleteProfiles
                .Where(x => x.SchoolId == _schoolBId)
                .Select(x => x.Id)
                .SingleAsync());
        using var client = _factory.CreateAuthenticatedClient(_schoolAdminA, UserRole.SchoolAdmin);

        using var response = await client.GetAsync($"/api/school/athletes/{otherTenantAthleteId}/payments");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    public Task InitializeAsync()
    {
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
    }

    private async Task SeedSchoolsAndGroupsAsync()
    {
        await _factory.SeedAsync(db =>
        {
            db.Schools.AddRange(CreateSchool(_schoolAId, "Tenant A", "a"), CreateSchool(_schoolBId, "Tenant B", "b"));
            db.Users.Add(_schoolAdminA);
            db.TrainingGroups.AddRange(
                new TrainingGroup { SchoolId = _schoolAId, Name = "Tenant A Group" },
                new TrainingGroup { SchoolId = _schoolBId, Name = "Tenant B Group" });

            return Task.CompletedTask;
        });
    }

    private async Task SeedSchoolsAndAthletePaymentAsync()
    {
        await _factory.SeedAsync(db =>
        {
            db.Schools.AddRange(CreateSchool(_schoolAId, "Tenant A", "a"), CreateSchool(_schoolBId, "Tenant B", "b"));
            db.Users.Add(_schoolAdminA);

            var athleteB = TestUsers.Create(_schoolBId, "athlete-b@example.com", "Athlete B", "password", UserRole.Athlete, UserRole.Parent);
            var profileB = new AthleteProfile
            {
                SchoolId = _schoolBId,
                User = athleteB,
                FirstName = "Athlete",
                LastName = "B",
                BirthDate = new DateOnly(2012, 1, 1),
                ParentFullName = "Parent B",
                ParentPhone = "555"
            };

            db.Users.Add(athleteB);
            db.AthleteProfiles.Add(profileB);
            db.StudentPayments.Add(new StudentPayment
            {
                SchoolId = _schoolBId,
                AthleteProfile = profileB,
                Year = 2026,
                Month = 5,
                Amount = 1000,
                Status = PaymentStatus.Paid
            });

            return Task.CompletedTask;
        });
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
}
