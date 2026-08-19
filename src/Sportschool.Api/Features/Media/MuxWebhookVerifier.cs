using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Sportschool.Api.Features.Media;

public sealed class MuxWebhookVerifier(IOptions<MuxOptions> options)
{
    private static readonly TimeSpan TimestampTolerance = TimeSpan.FromMinutes(5);
    private readonly byte[] _secret = Encoding.UTF8.GetBytes(options.Value.WebhookSigningSecret);

    public bool IsValid(string body, string? signatureHeader)
    {
        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            return false;
        }

        string? timestampValue = null;
        string? signatureValue = null;
        foreach (var part in signatureHeader.Split(','))
        {
            var fields = part.Split('=', 2);
            if (fields.Length != 2)
            {
                continue;
            }

            if (fields[0] == "t") timestampValue = fields[1];
            if (fields[0] == "v1") signatureValue = fields[1];
        }

        if (!long.TryParse(timestampValue, NumberStyles.None, CultureInfo.InvariantCulture, out var timestamp)
            || string.IsNullOrWhiteSpace(signatureValue))
        {
            return false;
        }

        var sentAt = DateTimeOffset.FromUnixTimeSeconds(timestamp);
        if ((DateTimeOffset.UtcNow - sentAt).Duration() > TimestampTolerance)
        {
            return false;
        }

        byte[] actualSignature;
        try
        {
            actualSignature = Convert.FromHexString(signatureValue);
        }
        catch (FormatException)
        {
            return false;
        }

        var signedPayload = Encoding.UTF8.GetBytes($"{timestampValue}.{body}");
        var expectedSignature = HMACSHA256.HashData(_secret, signedPayload);
        return CryptographicOperations.FixedTimeEquals(actualSignature, expectedSignature);
    }
}
