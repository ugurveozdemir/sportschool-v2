namespace Sportschool.Api.Features.Bootstrap;

public sealed class DevSeedOptions
{
    public const string SectionName = "DevSeed";

    public bool Enabled { get; set; }

    public string PlatformOwnerEmail { get; set; } = "";

    public string PlatformOwnerFullName { get; set; } = "";

    public string PlatformOwnerPassword { get; set; } = "";
}
