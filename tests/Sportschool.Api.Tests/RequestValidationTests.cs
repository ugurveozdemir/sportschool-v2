using Sportschool.Api.Common;

namespace Sportschool.Api.Tests;

public sealed class RequestValidationTests
{
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
