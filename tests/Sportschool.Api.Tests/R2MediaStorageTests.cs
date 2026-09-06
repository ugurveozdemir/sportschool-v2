using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Sportschool.Api.Features.Media;

namespace Sportschool.Api.Tests;

public sealed class R2MediaStorageTests
{
    [Fact]
    public async Task SaveAsync_DisablesPayloadSigningAndTrailerChecksumForCloudflareR2()
    {
        var fakeS3 = new FakeAmazonS3Client();
        var options = Options.Create(new R2Options
        {
            AccountId = "test-account",
            BucketName = "test-bucket",
            AccessKeyId = "test-key",
            SecretAccessKey = "test-secret"
        });

        var storage = new R2MediaStorage(options, fakeS3);
        var file = CreateFormFile("avatar.jpg", "image/jpeg", [1, 2, 3, 4]);

        var key = await storage.SaveAsync(file, "profile-images/school1/athlete1", ".jpg", CancellationToken.None);

        Assert.NotNull(fakeS3.LastPutRequest);
        Assert.True(fakeS3.LastPutRequest.DisablePayloadSigning, "DisablePayloadSigning must be true for Cloudflare R2.");
        Assert.True(fakeS3.LastPutRequest.DisableDefaultChecksumValidation, "DisableDefaultChecksumValidation must be true for Cloudflare R2.");
        Assert.Equal("test-bucket", fakeS3.LastPutRequest.BucketName);
        Assert.Equal("image/jpeg", fakeS3.LastPutRequest.ContentType);
        Assert.StartsWith("profile-images/school1/athlete1/", key);
        Assert.EndsWith(".jpg", key);
        Assert.Equal(key, fakeS3.LastPutRequest.Key);
    }

    [Fact]
    public async Task DeleteAsync_SendsCorrectBucketAndKey()
    {
        var fakeS3 = new FakeAmazonS3Client();
        var options = Options.Create(new R2Options
        {
            AccountId = "test-account",
            BucketName = "test-bucket",
            AccessKeyId = "test-key",
            SecretAccessKey = "test-secret"
        });

        var storage = new R2MediaStorage(options, fakeS3);
        await storage.DeleteAsync("profile-images/school1/athlete1/test.jpg", CancellationToken.None);

        Assert.NotNull(fakeS3.LastDeleteRequest);
        Assert.Equal("test-bucket", fakeS3.LastDeleteRequest.BucketName);
        Assert.Equal("profile-images/school1/athlete1/test.jpg", fakeS3.LastDeleteRequest.Key);
    }

    [Fact]
    public async Task OpenReadAsync_ReturnsNull_WhenS3ThrowsNoSuchKey()
    {
        var fakeS3 = new FakeAmazonS3Client { ThrowNoSuchKeyOnGet = true };
        var options = Options.Create(new R2Options
        {
            AccountId = "test-account",
            BucketName = "test-bucket",
            AccessKeyId = "test-key",
            SecretAccessKey = "test-secret"
        });

        var storage = new R2MediaStorage(options, fakeS3);
        var result = await storage.OpenReadAsync("profile-images/school1/athlete1/test.jpg", CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public void ProgramR2Options_BindsSingleUnderscoreEnvironmentVariablesFallback()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            ["R2_ACCOUNT_ID"] = "env-account",
            ["R2_BUCKET_NAME"] = "env-bucket",
            ["R2_ACCESS_KEY_ID"] = "env-key",
            ["R2_SECRET_ACCESS_KEY"] = "env-secret"
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddOptions<R2Options>()
            .Bind(configuration.GetSection(R2Options.SectionName))
            .PostConfigure(options =>
            {
                if (string.IsNullOrWhiteSpace(options.AccountId))
                {
                    options.AccountId = configuration["R2_ACCOUNT_ID"] ?? string.Empty;
                }

                if (string.IsNullOrWhiteSpace(options.BucketName))
                {
                    options.BucketName = configuration["R2_BUCKET_NAME"] ?? string.Empty;
                }

                if (string.IsNullOrWhiteSpace(options.AccessKeyId))
                {
                    options.AccessKeyId = configuration["R2_ACCESS_KEY_ID"] ?? string.Empty;
                }

                if (string.IsNullOrWhiteSpace(options.SecretAccessKey))
                {
                    options.SecretAccessKey = configuration["R2_SECRET_ACCESS_KEY"] ?? string.Empty;
                }
            });

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<R2Options>>().Value;

        Assert.True(options.IsConfigured);
        Assert.Equal("env-account", options.AccountId);
        Assert.Equal("env-bucket", options.BucketName);
        Assert.Equal("env-key", options.AccessKeyId);
        Assert.Equal("env-secret", options.SecretAccessKey);
    }

    private static IFormFile CreateFormFile(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "image", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private sealed class FakeAmazonS3Client : AmazonS3Client
    {
        public FakeAmazonS3Client()
            : base("fake-key", "fake-secret", new AmazonS3Config { ServiceURL = "http://localhost" })
        {
        }

        public PutObjectRequest? LastPutRequest { get; private set; }
        public DeleteObjectRequest? LastDeleteRequest { get; private set; }
        public bool ThrowNoSuchKeyOnGet { get; set; }

        public override Task<PutObjectResponse> PutObjectAsync(PutObjectRequest request, CancellationToken cancellationToken = default)
        {
            LastPutRequest = request;
            return Task.FromResult(new PutObjectResponse());
        }

        public override Task<DeleteObjectResponse> DeleteObjectAsync(DeleteObjectRequest request, CancellationToken cancellationToken = default)
        {
            LastDeleteRequest = request;
            return Task.FromResult(new DeleteObjectResponse());
        }

        public override Task<GetObjectResponse> GetObjectAsync(GetObjectRequest request, CancellationToken cancellationToken = default)
        {
            if (ThrowNoSuchKeyOnGet)
            {
                throw new AmazonS3Exception("NoSuchKey")
                {
                    StatusCode = HttpStatusCode.NotFound,
                    ErrorCode = "NoSuchKey"
                };
            }

            return Task.FromResult(new GetObjectResponse
            {
                ResponseStream = new MemoryStream([1, 2, 3]),
                Headers = { ContentType = "image/jpeg" }
            });
        }
    }
}
