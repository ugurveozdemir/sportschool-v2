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
            new SavePaymentRequest(1500m, PaymentStatus.Paid, null));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payment = await response.Content.ReadFromJsonAsync<PaymentResponse>(JsonOptions);
        Assert.NotNull(payment);
        Assert.Equal(PaymentStatus.Paid, payment!.EffectiveStatus);
        Assert.Equal(1500m, payment.Amount);
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
            new SavePaymentRequest(1000m, PaymentStatus.Paid, null));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PaymentSettings_RoundTrip()
    {
        await SeedSchoolWithAthletesAsync();
        using var client = _factory.CreateAuthenticatedClient(_coach, UserRole.Coach);

        using var save = await client.PutAsJsonAsync(
            "/api/school/payment-settings",
            new SavePaymentSettingsRequest(1200m, 25));
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);

        var settings = await client.GetFromJsonAsync<PaymentSettingsResponse>("/api/school/payment-settings", JsonOptions);
        Assert.NotNull(settings);
        Assert.Equal(1200m, settings!.DefaultMonthlyFee);
        Assert.Equal(25, settings.PaymentDayOfMonth);
    }

    [Fact]
    public async Task PaymentSettings_RejectsInvalidPaymentDay()
    {
        await SeedSchoolWithAthletesAsync();
        using var client = _factory.CreateAuthenticatedClient(_coach, UserRole.Coach);

        using var response = await client.PutAsJsonAsync(
            "/api/school/payment-settings",
            new SavePaymentSettingsRequest(1200m, 31));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MonthlyList_FillsAmountFromFee_WithAthleteOverride()
    {
        await SeedSchoolWithAthletesAsync();
        var athleteId = await FirstAthleteIdAsync(_schoolId); // "Ada Aydin" (orders first)
        using var client = _factory.CreateAuthenticatedClient(_coach, UserRole.Coach);

        await client.PutAsJsonAsync("/api/school/payment-settings", new SavePaymentSettingsRequest(1200m, 5));
        using var feeResponse = await client.PutAsJsonAsync(
            $"/api/school/athletes/{athleteId}/fee",
            new SaveAthleteFeeRequest(800m));
        Assert.Equal(HttpStatusCode.OK, feeResponse.StatusCode);

        var now = DateTime.UtcNow;
        var rows = await client.GetFromJsonAsync<List<MonthlyPaymentResponse>>(
            $"/api/school/payments?year={now.Year}&month={now.Month}", JsonOptions);

        Assert.NotNull(rows);
        var overridden = Assert.Single(rows!, row => row.AthleteProfileId == athleteId);
        Assert.Equal(800m, overridden.Amount);
        Assert.Equal(800m, overridden.MonthlyFeeOverride);
        var defaulted = Assert.Single(rows!, row => row.AthleteProfileId != athleteId);
        Assert.Equal(1200m, defaulted.Amount);
        Assert.Null(defaulted.MonthlyFeeOverride);
    }

    [Fact]
    public async Task MonthlyList_FutureMonth_IsInactiveAndPending_BeforePaymentDay()
    {
        await SeedSchoolWithAthletesAsync();
        using var client = _factory.CreateAuthenticatedClient(_coach, UserRole.Coach);
        await client.PutAsJsonAsync("/api/school/payment-settings", new SavePaymentSettingsRequest(1000m, 15));

        // Two months ahead can never have activated yet, so it is inactive and merely upcoming.
        var future = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(2);
        var rows = await client.GetFromJsonAsync<List<MonthlyPaymentResponse>>(
            $"/api/school/payments?year={future.Year}&month={future.Month}", JsonOptions);

        Assert.NotNull(rows);
        Assert.All(rows!, row =>
        {
            Assert.False(row.IsActive);
            Assert.Equal(PaymentStatus.Pending, row.EffectiveStatus);
        });
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
