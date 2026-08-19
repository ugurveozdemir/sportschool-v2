using System.Net.Mail;

namespace Sportschool.Api.Common;

public static class RequestValidation
{
    public const int MaxPageSize = 100;
    public const int MaxUnpagedItems = 500;
    public const int MinimumPasswordLength = 8;
    public const int MaximumPasswordLength = 128;
    public const decimal MaximumMoneyAmount = 9_999_999_999.99m;

    public static bool HasRequiredText(string? value, int maximumLength) =>
        !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= maximumLength;

    public static bool HasOptionalText(string? value, int maximumLength) =>
        string.IsNullOrWhiteSpace(value) || value.Trim().Length <= maximumLength;

    public static bool HasValidEmail(string? value)
    {
        if (!HasRequiredText(value, maximumLength: 320))
        {
            return false;
        }

        var trimmed = value!.Trim();
        return MailAddress.TryCreate(trimmed, out var address)
            && string.Equals(address.Address, trimmed, StringComparison.OrdinalIgnoreCase);
    }

    public static bool HasValidPassword(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Length is >= MinimumPasswordLength and <= MaximumPasswordLength;

    public static bool HasValidBirthDate(DateOnly value)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return value <= today && value >= today.AddYears(-100);
    }

    public static bool HasValidMoneyAmount(decimal value, bool allowZero = true) =>
        value >= (allowZero ? 0 : 0.01m)
        && value <= MaximumMoneyAmount
        && decimal.Round(value, 2) == value;

    public static bool HasValidDateRange(DateTimeOffset start, DateTimeOffset end, int maximumDays) =>
        end > start && end - start <= TimeSpan.FromDays(maximumDays);

    public static bool HasValidPagination(int? page, int? pageSize) =>
        page.HasValue == pageSize.HasValue
        && (!page.HasValue || page is > 0 && pageSize is > 0 and <= MaxPageSize);
}
