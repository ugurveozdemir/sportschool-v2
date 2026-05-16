using System.Security.Cryptography;

namespace Sportschool.Api.Security;

public sealed class TemporaryPasswordGenerator
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private const int Length = 12;

    public string Create()
    {
        return RandomNumberGenerator.GetString(Alphabet, Length);
    }
}
