namespace Sportschool.Api.Features.Media;

public interface IMediaStorage
{
    Task<string> SaveAsync(IFormFile file, string directory, string extension, CancellationToken cancellationToken);

    Task DeleteAsync(string storageKey, CancellationToken cancellationToken);

    Task<StoredMedia?> OpenReadAsync(string storageKey, CancellationToken cancellationToken);
}

public sealed record StoredMedia(Stream Content, string ContentType);

public sealed class LocalMediaStorage(IWebHostEnvironment environment, IConfiguration configuration) : IMediaStorage
{
    private readonly string _rootPath = configuration["Media:LocalStoragePath"]
        ?? Path.Combine(environment.ContentRootPath, "AppData", "Media");

    public string RootPath
    {
        get
        {
            Directory.CreateDirectory(_rootPath);
            return _rootPath;
        }
    }

    public async Task<string> SaveAsync(IFormFile file, string directory, string extension, CancellationToken cancellationToken)
    {
        var storageKey = $"{directory}/{Guid.NewGuid():N}{extension}";
        var fullPath = GetFullPath(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, cancellationToken);
        return storageKey;
    }

    public Task DeleteAsync(string storageKey, CancellationToken cancellationToken)
    {
        var fullPath = GetFullPath(storageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    public Task<StoredMedia?> OpenReadAsync(string storageKey, CancellationToken cancellationToken)
    {
        var fullPath = GetFullPath(storageKey);
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<StoredMedia?>(null);
        }

        var contentType = Path.GetExtension(storageKey).ToLowerInvariant() switch
        {
            ".jpg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".mp4" => "video/mp4",
            ".mov" => "video/quicktime",
            _ => "application/octet-stream"
        };
        return Task.FromResult<StoredMedia?>(new StoredMedia(File.OpenRead(fullPath), contentType));
    }

    private string GetFullPath(string storageKey)
    {
        var normalizedKey = storageKey.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(RootPath, normalizedKey));
        var relativePath = Path.GetRelativePath(RootPath, fullPath);
        if (relativePath.StartsWith("..", StringComparison.Ordinal) || Path.IsPathRooted(relativePath))
        {
            throw new InvalidOperationException("Invalid media storage key.");
        }

        return fullPath;
    }
}
