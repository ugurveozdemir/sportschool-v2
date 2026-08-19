using Sportschool.Api.Common;

namespace Sportschool.Api.Tests;

public sealed class RequestValidationTests
{
    [Theory]
    [InlineData("value", 5, true)]
    [InlineData("   ", 5, false)]
    [InlineData("too-long", 5, false)]
    public void RequiredText_RequiresContentWithinLimit(string value, int maximumLength, bool expected)
    {
        Assert.Equal(expected, RequestValidation.HasRequiredText(value, maximumLength));
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("person@example.com", true)]
    [InlineData("not-an-email", false)]
    public void Email_RequiresAValidAddress(string? value, bool expected)
    {
        Assert.Equal(expected, RequestValidation.HasValidEmail(value));
    }

    [Theory]
    [InlineData("12345678", true)]
    [InlineData("1234567", false)]
    public void Password_RequiresSupportedLength(string value, bool expected)
    {
        Assert.Equal(expected, RequestValidation.HasValidPassword(value));
    }

    [Theory]
    [InlineData(0, true)]
    [InlineData(10.25, true)]
    [InlineData(10.251, false)]
    [InlineData(-0.01, false)]
    public void MoneyAmount_RequiresSupportedRangeAndPrecision(decimal value, bool expected)
    {
        Assert.Equal(expected, RequestValidation.HasValidMoneyAmount(value));
    }

    [Fact]
    public void BirthDate_RejectsFutureAndImplausiblyOldDates()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        Assert.True(RequestValidation.HasValidBirthDate(today.AddYears(-20)));
        Assert.False(RequestValidation.HasValidBirthDate(today.AddDays(1)));
        Assert.False(RequestValidation.HasValidBirthDate(today.AddYears(-101)));
    }

    [Fact]
    public void Pagination_RequiresPositivePairedValuesWithinLimit()
    {
        Assert.True(RequestValidation.HasValidPagination(null, null));
        Assert.True(RequestValidation.HasValidPagination(1, RequestValidation.MaxPageSize));
        Assert.False(RequestValidation.HasValidPagination(1, null));
        Assert.False(RequestValidation.HasValidPagination(0, 20));
        Assert.False(RequestValidation.HasValidPagination(1, RequestValidation.MaxPageSize + 1));
    }

    [Fact]
    public void DateRange_RequiresAscendingDatesWithinLimit()
    {
        var start = DateTimeOffset.UtcNow;

        Assert.True(RequestValidation.HasValidDateRange(start, start.AddDays(31), maximumDays: 31));
        Assert.False(RequestValidation.HasValidDateRange(start, start, maximumDays: 31));
        Assert.False(RequestValidation.HasValidDateRange(start, start.AddDays(32), maximumDays: 31));
    }
}
