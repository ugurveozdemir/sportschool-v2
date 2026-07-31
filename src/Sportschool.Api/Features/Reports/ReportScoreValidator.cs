namespace Sportschool.Api.Features.Reports;

public static class ReportScoreValidator
{
    public static bool IsValid(decimal score)
    {
        return score is >= 0 and <= 10 && score * 2 == decimal.Truncate(score * 2);
    }

    public static bool IsValidPercentage(decimal score)
    {
        return score is >= 0 and <= 100 && score == decimal.Truncate(score);
    }
}
