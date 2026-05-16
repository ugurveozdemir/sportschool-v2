namespace Sportschool.Api.Security;

public static class TextNormalizer
{
    public static string NormalizeEmail(string email)
    {
        return email.Trim().ToUpperInvariant();
    }

    public static string NormalizeSchoolCode(string schoolCode)
    {
        return schoolCode.Trim().ToUpperInvariant();
    }
}
