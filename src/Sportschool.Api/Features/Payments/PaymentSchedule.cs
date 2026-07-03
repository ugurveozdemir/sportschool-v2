namespace Sportschool.Api.Features.Payments;

/// <summary>
/// Billing rules shared across payment endpoints: how the effective fee is resolved and when a
/// month's dues become active/payable relative to the school's configured payment day.
/// </summary>
public static class PaymentSchedule
{
    /// <summary>
    /// The fee an athlete is billed: their own override if set, otherwise the school default.
    /// Null when neither is configured.
    /// </summary>
    public static decimal? EffectiveFee(decimal? schoolDefault, decimal? athleteOverride)
    {
        return athleteOverride ?? schoolDefault;
    }

    /// <summary>
    /// The date on which the dues for <paramref name="year"/>/<paramref name="month"/> become
    /// active. With a configured payment day D, next month's dues open on day D of the current
    /// month; without one they open on the first of their own month.
    /// </summary>
    public static DateOnly ActivationDate(int year, int month, int? paymentDay)
    {
        var firstOfMonth = new DateOnly(year, month, 1);
        if (paymentDay is null)
        {
            return firstOfMonth;
        }

        var previousMonth = firstOfMonth.AddMonths(-1);
        var day = Math.Min(paymentDay.Value, DateTime.DaysInMonth(previousMonth.Year, previousMonth.Month));
        return new DateOnly(previousMonth.Year, previousMonth.Month, day);
    }

    /// <summary>
    /// Whether the dues for the given month are active (visible/payable) as of <paramref name="today"/>.
    /// </summary>
    public static bool IsMonthActive(int year, int month, int? paymentDay, DateOnly today)
    {
        return today >= ActivationDate(year, month, paymentDay);
    }
}
