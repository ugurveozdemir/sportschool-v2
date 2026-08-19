namespace Sportschool.Api.Common;

public static class RequestValidation
{
    public const int MaxPageSize = 100;
    public const int MaxUnpagedItems = 500;

    public static bool HasValidDateRange(DateTimeOffset start, DateTimeOffset end, int maximumDays) =>
        end > start && end - start <= TimeSpan.FromDays(maximumDays);

    public static bool HasValidPagination(int? page, int? pageSize) =>
        page.HasValue == pageSize.HasValue
        && (!page.HasValue || page is > 0 && pageSize is > 0 and <= MaxPageSize);
}
