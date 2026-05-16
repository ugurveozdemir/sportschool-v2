using Microsoft.Extensions.Options;
using System.Security.Claims;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Tests;

public sealed class SecurityTests
{
    [Fact]
    public void PasswordHasher_VerifiesOriginalPasswordOnly()
    {
        var hasher = new PasswordHasher();

        var hash = hasher.Hash("correct-password");

        Assert.True(hasher.Verify("correct-password", hash));
        Assert.False(hasher.Verify("wrong-password", hash));
    }

    [Fact]
    public void RefreshTokenService_StoresHashInsteadOfPlainToken()
    {
        var service = CreateRefreshTokenService();

        var issuedToken = service.CreateToken(Guid.NewGuid(), UserRole.Coach, "iPhone");

        Assert.NotEqual(issuedToken.PlainTextToken, issuedToken.Entity.TokenHash);
        Assert.Equal(service.HashToken(issuedToken.PlainTextToken), issuedToken.Entity.TokenHash);
        Assert.Equal(UserRole.Coach, issuedToken.Entity.Role);
        Assert.Equal("iPhone", issuedToken.Entity.DeviceName);
    }

    [Fact]
    public void TemporaryPasswordGenerator_CreatesShortRandomPassword()
    {
        var generator = new TemporaryPasswordGenerator();

        var firstPassword = generator.Create();
        var secondPassword = generator.Create();

        Assert.Equal(12, firstPassword.Length);
        Assert.Equal(12, secondPassword.Length);
        Assert.NotEqual(firstPassword, secondPassword);
    }

    [Fact]
    public void CurrentUser_ReadsSchoolIdClaim()
    {
        var schoolId = Guid.NewGuid();
        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim("school_id", schoolId.ToString())
        ]));

        Assert.Equal(schoolId, CurrentUser.GetSchoolId(user));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(7.5)]
    [InlineData(10)]
    public void ReportScoreValidator_AcceptsHalfPointScores(decimal score)
    {
        Assert.True(ReportScoreValidator.IsValid(score));
    }

    [Theory]
    [InlineData(-0.5)]
    [InlineData(7.25)]
    [InlineData(10.5)]
    public void ReportScoreValidator_RejectsOutOfRangeOrQuarterPointScores(decimal score)
    {
        Assert.False(ReportScoreValidator.IsValid(score));
    }

    [Fact]
    public void PaymentStatusCalculator_MarksCurrentUnpaidMonthAsUnpaid()
    {
        var payment = new StudentPayment
        {
            SchoolId = Guid.NewGuid(),
            AthleteProfileId = Guid.NewGuid(),
            Year = 2026,
            Month = 5,
            Amount = 1000,
            Status = PaymentStatus.Pending
        };

        Assert.Equal(PaymentStatus.Unpaid, PaymentStatusCalculator.GetEffectiveStatus(payment, new DateOnly(2026, 5, 16)));
    }

    [Fact]
    public void PaymentStatusCalculator_KeepsFutureMonthPending()
    {
        var payment = new StudentPayment
        {
            SchoolId = Guid.NewGuid(),
            AthleteProfileId = Guid.NewGuid(),
            Year = 2026,
            Month = 6,
            Amount = 1000,
            Status = PaymentStatus.Pending
        };

        Assert.Equal(PaymentStatus.Pending, PaymentStatusCalculator.GetEffectiveStatus(payment, new DateOnly(2026, 5, 16)));
    }

    private static RefreshTokenService CreateRefreshTokenService()
    {
        return new RefreshTokenService(Options.Create(new JwtOptions
        {
            Issuer = "Sportschool",
            Audience = "SportschoolClients",
            SigningKey = "test-signing-key-with-at-least-32-characters",
            RefreshTokenDays = 30
        }));
    }
}
