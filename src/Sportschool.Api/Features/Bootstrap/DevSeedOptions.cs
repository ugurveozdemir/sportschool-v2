namespace Sportschool.Api.Features.Bootstrap;

public sealed class DevSeedOptions
{
    public const string SectionName = "DevSeed";

    public bool Enabled { get; set; }

    public string PlatformOwnerEmail { get; set; } = "";

    public string PlatformOwnerFullName { get; set; } = "";

    public string PlatformOwnerPassword { get; set; } = "";

    public string CoachSchoolCode { get; set; } = "istanbul";

    public string CoachEmail { get; set; } = "egitmen@istanbul.com";

    public string CoachFullName { get; set; } = "İstanbul Eğitmeni";

    public string CoachPassword { get; set; } = "";

    public string AthletePassword { get; set; } = "";
}
