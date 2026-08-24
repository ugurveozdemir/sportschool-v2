using Sportschool.Api.Common;

namespace Sportschool.Api.Tests;

public sealed class LocalDayRangeTests
{
    private static readonly TimeZoneInfo Istanbul = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    [Fact]
    public void StartOfToday_UsesLocalMidnight_NotUtcMidnight()
    {
        // 22:00 UTC is already 01:00 the next day in Istanbul (UTC+3),
        // so "today" must roll over to that next local day.
        var nowUtc = new DateTimeOffset(2026, 6, 23, 22, 0, 0, TimeSpan.Zero);

        var todayStart = LocalDayRange.StartOfToday(Istanbul, nowUtc);

        Assert.Equal(new DateTimeOffset(2026, 6, 24, 0, 0, 0, TimeSpan.FromHours(3)), todayStart);
        Assert.Equal(new DateTimeOffset(2026, 6, 23, 21, 0, 0, TimeSpan.Zero), todayStart.ToUniversalTime());
    }

    [Fact]
    public void StartOfToday_DaytimeInstant_ResolvesToSameLocalDay()
    {
        var nowUtc = new DateTimeOffset(2026, 6, 23, 8, 0, 0, TimeSpan.Zero);

        var todayStart = LocalDayRange.StartOfToday(Istanbul, nowUtc);

        Assert.Equal(new DateTimeOffset(2026, 6, 23, 0, 0, 0, TimeSpan.FromHours(3)), todayStart);
    }

    [Fact]
    public void StartOfToday_Utc_MatchesUtcMidnight()
    {
        var nowUtc = new DateTimeOffset(2026, 6, 23, 22, 0, 0, TimeSpan.Zero);

        var todayStart = LocalDayRange.StartOfToday(TimeZoneInfo.Utc, nowUtc);

        Assert.Equal(new DateTimeOffset(2026, 6, 23, 0, 0, 0, TimeSpan.Zero), todayStart);
    }

    [Fact]
    public void StartOfTodayUtc_ConvertsLocalMidnightToUtcInstant()
    {
        var nowUtc = new DateTimeOffset(2026, 6, 23, 22, 0, 0, TimeSpan.Zero);

        var todayStartUtc = LocalDayRange.StartOfTodayUtc(Istanbul, nowUtc);

        Assert.Equal(TimeSpan.Zero, todayStartUtc.Offset);
        Assert.Equal(new DateTimeOffset(2026, 6, 23, 21, 0, 0, TimeSpan.Zero), todayStartUtc);
    }
}
