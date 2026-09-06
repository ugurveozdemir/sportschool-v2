using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Audit;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Privacy;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class PrivacyCleanupProcessorTests
{
    [Fact]
    public async Task RunAsync_AnonymizesExpiredAthleteAndDeletesExpiredApplication()
    {
        await using var factory = new TestAppFactory();
        var now = new DateTimeOffset(2026, 9, 5, 12, 0, 0, TimeSpan.Zero);
        var school = new School
        {
            Id = Guid.NewGuid(),
            Name = "Test Academy",
            Code = "TEST",
            NormalizedCode = "TEST"
        };
        var admin = TestUsers.Create(school.Id, "admin@example.com", "Admin", "Password123!", UserRole.SchoolAdmin);
        var expiredUser = TestUsers.Create(school.Id, "expired@example.com", "Expired Athlete", "Password123!", UserRole.Athlete);
        var retainedUser = TestUsers.Create(school.Id, "retained@example.com", "Retained Athlete", "Password123!", UserRole.Athlete);
        var expiredProfile = CreateProfile(school.Id, expiredUser, now.AddMonths(-13));
        var retainedProfile = CreateProfile(school.Id, retainedUser, now.AddMonths(-11));
        var expiredApplication = CreateApplication(school.Id, now.AddDays(-31));
        var recentApplication = CreateApplication(school.Id, now.AddDays(-29));
        var video = new AthleteVideo
        {
            SchoolId = school.Id,
            AthleteProfile = expiredProfile,
            UploadedBy = admin,
            MuxAssetId = "mux-expired-asset",
            Caption = "Personal caption"
        };

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(school);
            db.Users.AddRange(admin, expiredUser, retainedUser);
            db.AthleteProfiles.AddRange(expiredProfile, retainedProfile);
            db.AthleteApplications.AddRange(expiredApplication, recentApplication);
            db.AthleteMeasurements.Add(new AthleteMeasurement
            {
                AthleteProfile = expiredProfile,
                Height = 150,
                Weight = 45,
                RecordedAt = new DateOnly(2026, 1, 1)
            });
            db.AthleteVideos.Add(video);
            db.AuditLogs.AddRange(
                CreateAuditLog(school.Id, now.AddDays(-91)),
                CreateAuditLog(school.Id, now.AddDays(-89)));
            return Task.CompletedTask;
        });

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var processor = scope.ServiceProvider.GetRequiredService<PrivacyCleanupProcessor>();
            var result = await processor.RunAsync(now, CancellationToken.None);

            Assert.Equal(new PrivacyCleanupResult(1, 1, 1), result);
        }

        var state = await factory.QueryAsync(async db => new
        {
            Expired = await db.AthleteProfiles.Include(x => x.User).SingleAsync(x => x.Id == expiredProfile.Id),
            Retained = await db.AthleteProfiles.Include(x => x.User).SingleAsync(x => x.Id == retainedProfile.Id),
            VideoCount = await db.AthleteVideos.CountAsync(x => x.AthleteProfileId == expiredProfile.Id),
            MeasurementCount = await db.AthleteMeasurements.CountAsync(x => x.AthleteProfileId == expiredProfile.Id),
            ExpiredApplicationExists = await db.AthleteApplications.AnyAsync(x => x.Id == expiredApplication.Id),
            RecentApplicationExists = await db.AthleteApplications.AnyAsync(x => x.Id == recentApplication.Id),
            AuditLogCount = await db.AuditLogs.CountAsync()
        });

        Assert.Equal("Silinmiş", state.Expired.FirstName);
        Assert.Equal("Silinmiş Sporcu", state.Expired.User.FullName);
        Assert.Equal(now, state.Expired.PersonalDataDeletedAt);
        Assert.Null(state.Expired.ParentUserId);
        Assert.Equal("Retained", state.Retained.FirstName);
        Assert.Null(state.Retained.PersonalDataDeletedAt);
        Assert.Equal(0, state.VideoCount);
        Assert.Equal(0, state.MeasurementCount);
        Assert.False(state.ExpiredApplicationExists);
        Assert.True(state.RecentApplicationExists);
        Assert.Equal(1, state.AuditLogCount);
        Assert.Contains("mux-expired-asset", factory.Mux.DeletedAssetIds);
    }

    private static AthleteProfile CreateProfile(Guid schoolId, AppUser user, DateTimeOffset deactivatedAt) => new()
    {
        SchoolId = schoolId,
        User = user,
        FirstName = user.FullName.Split(' ')[0],
        LastName = "Athlete",
        BirthDate = new DateOnly(2012, 1, 1),
        ParentFullName = "Parent",
        ParentPhone = "5550000000",
        IsActive = false,
        DeactivatedAt = deactivatedAt
    };

    private static AthleteApplication CreateApplication(Guid schoolId, DateTimeOffset decidedAt) => new()
    {
        SchoolId = schoolId,
        AthleteFirstName = "Applicant",
        AthleteLastName = "Athlete",
        AthleteBirthDate = new DateOnly(2013, 1, 1),
        AthleteEmail = $"{Guid.NewGuid():N}@example.com",
        NormalizedAthleteEmail = $"{Guid.NewGuid():N}@example.com",
        PasswordHash = "hash",
        ParentFullName = "Applicant Parent",
        ParentPhone = "5550000000",
        ParentEmail = $"{Guid.NewGuid():N}@example.com",
        NormalizedParentEmail = $"{Guid.NewGuid():N}@example.com",
        Status = AthleteApplicationStatus.Rejected,
        CreatedAt = decidedAt.AddDays(-1),
        DecidedAt = decidedAt
    };

    private static AuditLog CreateAuditLog(Guid schoolId, DateTimeOffset createdAt) => new()
    {
        SchoolId = schoolId,
        Method = "GET",
        Path = "/api/test",
        StatusCode = 200,
        CorrelationId = Guid.NewGuid().ToString("N"),
        CreatedAt = createdAt
    };
}
