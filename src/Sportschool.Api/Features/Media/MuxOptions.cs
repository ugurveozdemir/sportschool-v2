namespace Sportschool.Api.Features.Media;

public sealed class MuxOptions
{
    public const string SectionName = "Mux";

    public bool Enabled { get; set; }

    public string TokenId { get; set; } = string.Empty;

    public string TokenSecret { get; set; } = string.Empty;

    public string WebhookSigningSecret { get; set; } = string.Empty;

    public string PlaybackSigningKeyId { get; set; } = string.Empty;

    public string PlaybackSigningPrivateKey { get; set; } = string.Empty;

    public string UploadOrigin { get; set; } = string.Empty;

    public string VideoQuality { get; set; } = "basic";

    public int PlaybackTokenMinutes { get; set; } = 60;

    public bool HasRequiredSettings() =>
        !string.IsNullOrWhiteSpace(TokenId)
        && !string.IsNullOrWhiteSpace(TokenSecret)
        && !string.IsNullOrWhiteSpace(WebhookSigningSecret)
        && !string.IsNullOrWhiteSpace(PlaybackSigningKeyId)
        && !string.IsNullOrWhiteSpace(PlaybackSigningPrivateKey)
        && Uri.TryCreate(UploadOrigin, UriKind.Absolute, out _)
        && VideoQuality is "basic" or "plus" or "premium"
        && PlaybackTokenMinutes is >= 5 and <= 1440;
}
