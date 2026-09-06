using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Audit;
using Sportschool.Api.Features.Media;

namespace Sportschool.Api.Features.Privacy;

public sealed class PrivacyCleanupProcessor(
    SportschoolDbContext db,
    IMediaStorage storage,
    IMuxVideoClient mux,
    ILogger<PrivacyCleanupProcessor> logger)
{
    private const string DeletedText = "Kişisel veriler silindi.";

    public async Task<PrivacyCleanupResult> RunAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var deletedApplicationCount = await DeleteExpiredApplicationsAsync(now, cancellationToken);
        var anonymizedAthleteCount = await AnonymizeExpiredAthletesAsync(now, cancellationToken);
        var deletedAuditLogCount = await DeleteExpiredAuditLogsAsync(now, cancellationToken);
        return new PrivacyCleanupResult(anonymizedAthleteCount, deletedApplicationCount, deletedAuditLogCount);
    }

    private async Task<int> AnonymizeExpiredAthletesAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var cutoff = now.AddMonths(-12);
        var inactiveProfiles = await db.AthleteProfiles
            .Include(x => x.User)
            .Where(x =>
                !x.IsActive
                && x.DeactivatedAt != null
                && x.PersonalDataDeletedAt == null)
            .ToListAsync(cancellationToken);
        var profiles = inactiveProfiles
            .Where(x => x.DeactivatedAt <= cutoff)
            .ToList();

        foreach (var profile in profiles)
        {
            await AnonymizeAthleteAsync(profile, now, cancellationToken);
        }

        if (profiles.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Anonymized personal data for {AthleteCount} expired athlete records.", profiles.Count);
        }

        return profiles.Count;
    }

    private async Task AnonymizeAthleteAsync(
        AthleteProfile profile,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var originalNormalizedEmail = profile.User.NormalizedEmail;
        var videos = await db.AthleteVideos
            .Where(x => x.AthleteProfileId == profile.Id)
            .ToListAsync(cancellationToken);

        if (profile.ProfileImageStorageKey is not null)
        {
            await storage.DeleteAsync(profile.ProfileImageStorageKey, cancellationToken);
        }

        foreach (var video in videos)
        {
            if (video.StorageKey is not null)
            {
                await storage.DeleteAsync(video.StorageKey, cancellationToken);
            }

            if (video.MuxAssetId is not null)
            {
                await mux.DeleteAssetAsync(video.MuxAssetId, cancellationToken);
            }
        }

        db.AthleteVideos.RemoveRange(videos);

        var measurements = await db.AthleteMeasurements
            .Where(x => x.AthleteProfileId == profile.Id)
            .ToListAsync(cancellationToken);
        db.AthleteMeasurements.RemoveRange(measurements);

        var memberships = await db.GroupAthletes
            .Where(x => x.AthleteProfileId == profile.Id)
            .ToListAsync(cancellationToken);
        db.GroupAthletes.RemoveRange(memberships);

        var announcementReads = await db.AnnouncementReads
            .Where(x => x.UserId == profile.UserId)
            .ToListAsync(cancellationToken);
        db.AnnouncementReads.RemoveRange(announcementReads);

        var refreshTokens = await db.RefreshTokens
            .Where(x => x.UserId == profile.UserId)
            .ToListAsync(cancellationToken);
        db.RefreshTokens.RemoveRange(refreshTokens);

        var reports = await db.AthleteReports
            .Where(x => x.AthleteProfileId == profile.Id)
            .ToListAsync(cancellationToken);
        foreach (var report in reports)
        {
            report.Summary = DeletedText;
            report.ImprovementAreas = DeletedText;
        }

        var trainingReports = await db.TrainingAthleteReports
            .Where(x => x.AthleteProfileId == profile.Id)
            .ToListAsync(cancellationToken);
        foreach (var report in trainingReports)
        {
            report.CoachNote = null;
        }

        var applications = await db.AthleteApplications
            .Where(x =>
                x.ApprovedUserId == profile.UserId
                || (x.SchoolId == profile.SchoolId && x.NormalizedAthleteEmail == originalNormalizedEmail))
            .ToListAsync(cancellationToken);
        db.AthleteApplications.RemoveRange(applications);

        profile.FirstName = "Silinmiş";
        profile.LastName = "Sporcu";
        profile.BirthDate = new DateOnly(1970, 1, 1);
        profile.ParentFullName = string.Empty;
        profile.ParentPhone = string.Empty;
        profile.ParentUserId = null;
        profile.ProfileImageStorageKey = null;
        profile.ProfileImageVersion = null;
        profile.MonthlyFeeOverride = null;
        profile.PersonalDataDeletedAt = now;

        profile.User.Email = $"deleted-{profile.UserId:N}@anonymized.invalid";
        profile.User.NormalizedEmail = profile.User.Email.ToLowerInvariant();
        profile.User.FullName = "Silinmiş Sporcu";
        profile.User.PasswordHash = "deleted";
    }

    private async Task<int> DeleteExpiredApplicationsAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var rejectedCutoff = now.AddDays(-30);
        var pendingCutoff = now.AddDays(-90);
        var candidates = await db.AthleteApplications
            .Where(x =>
                x.Status == AthleteApplicationStatus.Rejected
                || x.Status == AthleteApplicationStatus.Pending)
            .ToListAsync(cancellationToken);
        var expired = candidates
            .Where(x =>
                (x.Status == AthleteApplicationStatus.Rejected && x.DecidedAt <= rejectedCutoff)
                || (x.Status == AthleteApplicationStatus.Pending && x.CreatedAt <= pendingCutoff))
            .ToList();

        if (expired.Count > 0)
        {
            db.AthleteApplications.RemoveRange(expired);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Deleted {ApplicationCount} expired athlete applications.", expired.Count);
        }

        return expired.Count;
    }

    private async Task<int> DeleteExpiredAuditLogsAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var cutoff = now.AddDays(-90);
        List<AuditLog> expired;
        if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            var candidates = await db.AuditLogs.ToListAsync(cancellationToken);
            expired = candidates.Where(x => x.CreatedAt <= cutoff).ToList();
        }
        else
        {
            expired = await db.AuditLogs
                .Where(x => x.CreatedAt <= cutoff)
                .ToListAsync(cancellationToken);
        }

        if (expired.Count > 0)
        {
            db.AuditLogs.RemoveRange(expired);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Deleted {AuditLogCount} expired audit log records.", expired.Count);
        }

        return expired.Count;
    }
}

public sealed record PrivacyCleanupResult(
    int AnonymizedAthleteCount,
    int DeletedApplicationCount,
    int DeletedAuditLogCount);
