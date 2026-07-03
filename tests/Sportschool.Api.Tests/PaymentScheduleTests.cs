using Sportschool.Api.Features.Payments;

namespace Sportschool.Api.Tests;

public sealed class PaymentScheduleTests
{
    [Fact]
    public void EffectiveFee_UsesSchoolDefault_WhenNoOverride()
    {
        Assert.Equal(1000m, PaymentSchedule.EffectiveFee(1000m, null));
    }

    [Fact]
    public void EffectiveFee_PrefersAthleteOverride()
    {
        Assert.Equal(800m, PaymentSchedule.EffectiveFee(1000m, 800m));
    }

    [Fact]
    public void EffectiveFee_UsesOverride_EvenWithoutSchoolDefault()
    {
        Assert.Equal(750m, PaymentSchedule.EffectiveFee(null, 750m));
    }

    [Fact]
    public void EffectiveFee_IsNull_WhenNeitherConfigured()
    {
        Assert.Null(PaymentSchedule.EffectiveFee(null, null));
    }

    [Fact]
    public void ActivationDate_OpensOnPaymentDayOfPreviousMonth()
    {
        Assert.Equal(new DateOnly(2026, 6, 25), PaymentSchedule.ActivationDate(2026, 7, 25));
    }

    [Fact]
    public void ActivationDate_RollsOverToPreviousYear()
    {
        Assert.Equal(new DateOnly(2025, 12, 10), PaymentSchedule.ActivationDate(2026, 1, 10));
    }

    [Fact]
    public void ActivationDate_ClampsToShortPreviousMonth()
    {
        // No 31 February; activation clamps to the last day of the previous month.
        Assert.Equal(new DateOnly(2026, 2, 28), PaymentSchedule.ActivationDate(2026, 3, 31));
    }

    [Fact]
    public void ActivationDate_WithoutPaymentDay_IsFirstOfOwnMonth()
    {
        Assert.Equal(new DateOnly(2026, 7, 1), PaymentSchedule.ActivationDate(2026, 7, null));
    }

    [Fact]
    public void IsMonthActive_TrueOnAndAfterPaymentDay()
    {
        Assert.True(PaymentSchedule.IsMonthActive(2026, 7, 25, new DateOnly(2026, 6, 25)));
        Assert.True(PaymentSchedule.IsMonthActive(2026, 7, 25, new DateOnly(2026, 6, 30)));
    }

    [Fact]
    public void IsMonthActive_FalseBeforePaymentDay()
    {
        Assert.False(PaymentSchedule.IsMonthActive(2026, 7, 25, new DateOnly(2026, 6, 24)));
    }
}
