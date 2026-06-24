namespace Sportschool.Api.Common;

/// <summary>
/// Computes calendar-day boundaries in a configured time zone rather than UTC,
/// so "today" matches the user's wall clock (e.g. Europe/Istanbul) when filtering
/// trainings whose timestamps are stored as UTC instants.
/// </summary>
public static class LocalDayRange
{
    public static DateTimeOffset StartOfToday(TimeZoneInfo timeZone, DateTimeOffset? nowUtc = null)
    {
        var local = TimeZoneInfo.ConvertTime(nowUtc ?? DateTimeOffset.UtcNow, timeZone);
        var midnight = local.Date;
        return new DateTimeOffset(midnight, timeZone.GetUtcOffset(midnight));
    }
}
