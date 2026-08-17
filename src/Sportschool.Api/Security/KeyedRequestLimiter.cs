using Microsoft.Extensions.Caching.Memory;

namespace Sportschool.Api.Security;

public sealed class KeyedRequestLimiter : IDisposable
{
    private const int MaxTrackedKeys = 10_000;
    private readonly MemoryCache cache = new(new MemoryCacheOptions { SizeLimit = MaxTrackedKeys });
    private readonly object gate = new();

    public bool TryAcquire(string key, int permitLimit, TimeSpan window, out int retryAfterSeconds)
    {
        lock (gate)
        {
            var now = DateTimeOffset.UtcNow;
            if (!cache.TryGetValue(key, out AttemptWindow? attempts) || attempts is null || attempts.ExpiresAt <= now)
            {
                var expiresAt = now.Add(window);
                cache.Set(
                    key,
                    new AttemptWindow(1, expiresAt),
                    new MemoryCacheEntryOptions { AbsoluteExpiration = expiresAt, Size = 1 });
                retryAfterSeconds = 0;
                return true;
            }

            if (attempts.Count >= permitLimit)
            {
                retryAfterSeconds = Math.Max(1, (int)Math.Ceiling((attempts.ExpiresAt - now).TotalSeconds));
                return false;
            }

            attempts.Count++;
            retryAfterSeconds = 0;
            return true;
        }
    }

    public void Dispose() => cache.Dispose();

    private sealed class AttemptWindow(int count, DateTimeOffset expiresAt)
    {
        public int Count { get; set; } = count;
        public DateTimeOffset ExpiresAt { get; } = expiresAt;
    }
}
