using System.Net;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace Sportschool.Api.Features.Media;

public sealed class R2MediaStorage : IMediaStorage
{
    private readonly R2Options _options;
    private readonly IAmazonS3 _client;

    public R2MediaStorage(IOptions<R2Options> options)
    {
        _options = options.Value;
        _client = CreateClient(_options);
    }

    public async Task<string> SaveAsync(IFormFile file, string directory, string extension, CancellationToken cancellationToken)
    {
        var storageKey = $"{directory}/{Guid.NewGuid():N}{extension}";

        await using var content = file.OpenReadStream();
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = storageKey,
            InputStream = content,
            ContentType = file.ContentType
        }, cancellationToken);

        return storageKey;
    }

    public async Task DeleteAsync(string storageKey, CancellationToken cancellationToken)
    {
        await _client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = _options.BucketName,
            Key = storageKey
        }, cancellationToken);
    }

    public async Task<StoredMedia?> OpenReadAsync(string storageKey, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _client.GetObjectAsync(new GetObjectRequest
            {
                BucketName = _options.BucketName,
                Key = storageKey
            }, cancellationToken);
            return new StoredMedia(response.ResponseStream, response.Headers.ContentType ?? "application/octet-stream");
        }
        catch (AmazonS3Exception exception) when (
            exception.StatusCode == HttpStatusCode.NotFound
            || string.Equals(exception.ErrorCode, "NoSuchKey", StringComparison.Ordinal))
        {
            return null;
        }
    }

    private static IAmazonS3 CreateClient(R2Options options)
    {
        var credentials = new BasicAWSCredentials(options.AccessKeyId, options.SecretAccessKey);
        var configuration = new AmazonS3Config
        {
            ServiceURL = $"https://{options.AccountId}.r2.cloudflarestorage.com",
            AuthenticationRegion = "auto",
            ForcePathStyle = true
        };
        return new AmazonS3Client(credentials, configuration);
    }
}
