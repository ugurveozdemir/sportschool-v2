using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class PaymentEndpointTests : IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly TestAppFactory _factory = new();
    private readonly Guid _schoolId = Guid.NewGuid();
    private readonly AppUser _coach;

    public PaymentEndpointTests()
    {
        _coach = TestUsers.Create(_schoolId, "coach@example.com", "Coach", "password", UserRole.Coach);
    }

    [Fact]
    public async Task Coach_ListsWholeSchoolMonthlyPayments()
    {
        await SeedSchoolWithAthletesAsync();
        using var client = _factory.CreateAuthenticatedClient(_coach, UserRole.Coach);

        var rows = await client.GetFromJsonAsync<List<MonthlyPaymentResponse>>("/api/school/payments?year=2026&month=6", JsonOptions);

        Assert.NotNull(rows);
        Assert.Equal(2, rows!.Count);
        // No payment records seeded, so every athlete defaults to Unpaid regardless of the calendar.
        Assert.All(rows, row => Assert.Equal(PaymentStatus.Unpaid, row.EffectiveStatus));
    }

    [Fact]
    public async Task Coach_MarksPaymentPaid()
    {
        await SeedSchoolWithAthletesAsync();
        var athleteId = await FirstAthleteIdAsync(_schoolId);
        using var client = _factory.CreateAuthenticatedClient(_coach, UserRole.Coach);

        using var response = await client.PutAsJsonAsync(
            $"/api/school/athletes/{athleteId}/payments/2026/6",
            new SavePaymentRequest(1500m, null, PaymentStatus.Paid, null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payment = await response.Content.ReadFromJsonAsync<PaymentResponse>(JsonOptions);
        Assert.NotNull(payment);
        Assert.Equal(PaymentStatus.Paid, payment!.EffectiveStatus);
        Assert.Equal(1500m, payment.AmountPaid);
        Assert.Equal(0m, payment.Balance);
    }

    [Fact]
    public async Task Coach_CannotMarkOtherTenantPayment()
    {
        await SeedSchoolWithAthletesAsync();
        var otherSchoolId = Guid.NewGuid();
        await SeedOtherTenantAthleteAsync(otherSchoolId);
        var otherAthleteId = await FirstAthleteIdAsync(otherSchoolId);
        using var client = _factory.CreateAuthenticatedClient(_coach, UserRole.Coach);

        using var response = await client.PutAsJsonAsync(
            $"/api/school/athletes/{otherAthleteId}/payments/2026/6",
            new SavePaymentRequest(1000m, null, PaymentStatus.Paid, null));

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

    private Task<Guid> FirstAthleteIdAsync(Guid schoolId)
    {
        return _factory.QueryAsync(db => db.AthleteProfiles
            .Where(x => x.SchoolId == schoolId)
            .OrderBy(x => x.LastName)
            .Select(x => x.Id)
            .FirstAsync());
    }

    private async Task SeedSchoolWithAthletesAsync()
    {
        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(_schoolId, "Tenant", "t"));
            db.Users.Add(_coach);
            AddAthlete(db, _schoolId, "Ada", "Aydin", "ada@example.com");
            AddAthlete(db, _schoolId, "Bora", "Bal", "bora@example.com");
            return Task.CompletedTask;
        });
    }

    private async Task SeedOtherTenantAthleteAsync(Guid otherSchoolId)
    {
        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(otherSchoolId, "Other", "o"));
            AddAthlete(db, otherSchoolId, "Cem", "Can", "cem@other.com");
            return Task.CompletedTask;
        });
    }

    private static void AddAthlete(Data.SportschoolDbContext db, Guid schoolId, string firstName, string lastName, string email)
    {
        var athlete = TestUsers.Create(schoolId, email, $"{firstName} {lastName}", "password", UserRole.Athlete);
        db.Users.Add(athlete);
        db.AthleteProfiles.Add(new AthleteProfile
        {
            SchoolId = schoolId,
            User = athlete,
            FirstName = firstName,
            LastName = lastName,
            BirthDate = new DateOnly(2012, 1, 1),
            ParentFullName = $"Parent {lastName}",
            ParentPhone = "555"
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
