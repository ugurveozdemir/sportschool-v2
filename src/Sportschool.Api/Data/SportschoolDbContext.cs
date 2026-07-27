using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Features.Announcements;
using Sportschool.Api.Features.Matches;
using Sportschool.Api.Features.Media;

namespace Sportschool.Api.Data;

public sealed class SportschoolDbContext(DbContextOptions<SportschoolDbContext> options)
    : DbContext(options)
{
    public DbSet<School> Schools => Set<School>();

    public DbSet<AppUser> Users => Set<AppUser>();

    public DbSet<UserRoleAssignment> UserRoles => Set<UserRoleAssignment>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<AthleteApplication> AthleteApplications => Set<AthleteApplication>();

    public DbSet<AthleteProfile> AthleteProfiles => Set<AthleteProfile>();

    public DbSet<TrainingGroup> TrainingGroups => Set<TrainingGroup>();

    public DbSet<GroupAthlete> GroupAthletes => Set<GroupAthlete>();

    public DbSet<TrainingSession> TrainingSessions => Set<TrainingSession>();

    public DbSet<TrainingSessionGroup> TrainingSessionGroups => Set<TrainingSessionGroup>();

    public DbSet<AthleteReport> AthleteReports => Set<AthleteReport>();

    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();

    public DbSet<StudentPayment> StudentPayments => Set<StudentPayment>();

    public DbSet<Announcement> Announcements => Set<Announcement>();

    public DbSet<AnnouncementRead> AnnouncementReads => Set<AnnouncementRead>();

    public DbSet<MatchSession> MatchSessions => Set<MatchSession>();

    public DbSet<MatchSquad> MatchSquads => Set<MatchSquad>();

    public DbSet<AthleteMeasurement> AthleteMeasurements => Set<AthleteMeasurement>();

    public DbSet<AthleteVideo> AthleteVideos => Set<AthleteVideo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<School>(school =>
        {
            school.HasKey(x => x.Id);
            school.Property(x => x.Name).HasMaxLength(160).IsRequired();
            school.Property(x => x.Code).HasMaxLength(40).IsRequired();
            school.Property(x => x.NormalizedCode).HasMaxLength(40).IsRequired();
            school.Property(x => x.DefaultMonthlyFee).HasPrecision(12, 2);
            school.HasIndex(x => x.NormalizedCode).IsUnique();
        });

        modelBuilder.Entity<AppUser>(user =>
        {
            user.HasKey(x => x.Id);
            user.Property(x => x.Email).HasMaxLength(320).IsRequired();
            user.Property(x => x.NormalizedEmail).HasMaxLength(320).IsRequired();
            user.Property(x => x.FullName).HasMaxLength(160).IsRequired();
            user.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            user.HasIndex(x => new { x.SchoolId, x.NormalizedEmail }).IsUnique();
            user.HasIndex(x => x.NormalizedEmail)
                .IsUnique()
                .HasFilter("\"SchoolId\" IS NULL");

            user.HasOne(x => x.School)
                .WithMany(x => x.Users)
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserRoleAssignment>(role =>
        {
            role.HasKey(x => new { x.UserId, x.Role });
            role.Property(x => x.Role).HasConversion<string>().HasMaxLength(40);

            role.HasOne(x => x.User)
                .WithMany(x => x.Roles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(refreshToken =>
        {
            refreshToken.HasKey(x => x.Id);
            refreshToken.Property(x => x.TokenHash).HasMaxLength(100).IsRequired();
            refreshToken.Property(x => x.Role).HasConversion<string>().HasMaxLength(40);
            refreshToken.Property(x => x.DeviceName).HasMaxLength(120);
            refreshToken.Property(x => x.ReplacedByTokenHash).HasMaxLength(100);
            refreshToken.HasIndex(x => x.TokenHash).IsUnique();
            refreshToken.HasIndex(x => new { x.UserId, x.ExpiresAt });

            refreshToken.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AthleteApplication>(application =>
        {
            application.HasKey(x => x.Id);
            application.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            application.Property(x => x.AthleteFirstName).HasMaxLength(80).IsRequired();
            application.Property(x => x.AthleteLastName).HasMaxLength(80).IsRequired();
            application.Property(x => x.AthleteEmail).HasMaxLength(320).IsRequired();
            application.Property(x => x.NormalizedAthleteEmail).HasMaxLength(320).IsRequired();
            application.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            application.Property(x => x.ParentFullName).HasMaxLength(160).IsRequired();
            application.Property(x => x.ParentPhone).HasMaxLength(40).IsRequired();
            application.Property(x => x.ParentEmail).HasMaxLength(320).IsRequired();
            application.Property(x => x.NormalizedParentEmail).HasMaxLength(320).IsRequired();
            application.HasIndex(x => new { x.SchoolId, x.NormalizedAthleteEmail, x.Status });

            application.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            application.HasOne(x => x.ApprovedUser)
                .WithMany()
                .HasForeignKey(x => x.ApprovedUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AthleteProfile>(athlete =>
        {
            athlete.HasKey(x => x.Id);
            athlete.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
            athlete.Property(x => x.LastName).HasMaxLength(80).IsRequired();
            athlete.Property(x => x.ParentFullName).HasMaxLength(160).IsRequired();
            athlete.Property(x => x.ParentPhone).HasMaxLength(40).IsRequired();
            athlete.Property(x => x.ProfileImageStorageKey).HasMaxLength(500);
            athlete.Property(x => x.MonthlyFeeOverride).HasPrecision(12, 2);
            athlete.HasIndex(x => new { x.SchoolId, x.UserId }).IsUnique();

            athlete.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            athlete.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            athlete.HasOne(x => x.Parent)
                .WithMany()
                .HasForeignKey(x => x.ParentUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TrainingGroup>(group =>
        {
            group.HasKey(x => x.Id);
            group.Property(x => x.Name).HasMaxLength(120).IsRequired();
            group.Property(x => x.Description).HasMaxLength(500);
            group.HasIndex(x => new { x.SchoolId, x.Name });

            group.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GroupAthlete>(membership =>
        {
            membership.HasKey(x => new { x.GroupId, x.AthleteProfileId });
            membership.HasIndex(x => new { x.AthleteProfileId, x.GroupId }).IsUnique();

            membership.HasOne(x => x.Group)
                .WithMany(x => x.Athletes)
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            membership.HasOne(x => x.AthleteProfile)
                .WithMany()
                .HasForeignKey(x => x.AthleteProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TrainingSession>(training =>
        {
            training.HasKey(x => x.Id);
            training.Property(x => x.Title).HasMaxLength(160).IsRequired();
            training.Property(x => x.Location).HasMaxLength(160);
            training.Property(x => x.Notes).HasMaxLength(1000);
            training.Property(x => x.Recurrence).HasConversion<string>().HasMaxLength(40);
            training.HasIndex(x => new { x.SchoolId, x.StartsAt });

            training.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            training.HasOne(x => x.Coach)
                .WithMany()
                .HasForeignKey(x => x.CoachId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TrainingSessionGroup>(trainingGroup =>
        {
            trainingGroup.HasKey(x => new { x.TrainingSessionId, x.GroupId });
            trainingGroup.HasIndex(x => new { x.GroupId, x.TrainingSessionId });

            trainingGroup.HasOne(x => x.TrainingSession)
                .WithMany(x => x.Groups)
                .HasForeignKey(x => x.TrainingSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            trainingGroup.HasOne(x => x.Group)
                .WithMany(x => x.TrainingSessions)
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AthleteReport>(report =>
        {
            report.HasKey(x => x.Id);
            report.Property(x => x.Summary).HasMaxLength(2000).IsRequired();
            report.Property(x => x.ImprovementAreas).HasMaxLength(2000).IsRequired();
            report.Property(x => x.SpeedScore).HasPrecision(3, 1);
            report.Property(x => x.StrengthScore).HasPrecision(3, 1);
            report.Property(x => x.DribblingScore).HasPrecision(3, 1);
            report.Property(x => x.ShootingScore).HasPrecision(3, 1);
            report.HasIndex(x => new { x.SchoolId, x.AthleteProfileId, x.CreatedAt });

            report.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            report.HasOne(x => x.AthleteProfile)
                .WithMany()
                .HasForeignKey(x => x.AthleteProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            report.HasOne(x => x.Coach)
                .WithMany()
                .HasForeignKey(x => x.CoachId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AttendanceRecord>(attendance =>
        {
            attendance.HasKey(x => x.Id);
            attendance.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            attendance.HasIndex(x => new { x.TrainingSessionId, x.AthleteProfileId }).IsUnique();
            attendance.HasIndex(x => new { x.SchoolId, x.TrainingSessionId });

            attendance.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            attendance.HasOne(x => x.TrainingSession)
                .WithMany()
                .HasForeignKey(x => x.TrainingSessionId)
                .OnDelete(DeleteBehavior.Restrict);

            attendance.HasOne(x => x.AthleteProfile)
                .WithMany()
                .HasForeignKey(x => x.AthleteProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            attendance.HasOne(x => x.RecordedBy)
                .WithMany()
                .HasForeignKey(x => x.RecordedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            attendance.HasOne(x => x.UpdatedBy)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StudentPayment>(payment =>
        {
            payment.HasKey(x => x.Id);
            payment.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            payment.Property(x => x.Amount).HasPrecision(12, 2);
            payment.HasIndex(x => new { x.SchoolId, x.AthleteProfileId, x.Year, x.Month }).IsUnique();

            payment.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            payment.HasOne(x => x.AthleteProfile)
                .WithMany()
                .HasForeignKey(x => x.AthleteProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            payment.HasOne(x => x.UpdatedBy)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Announcement>(announcement =>
        {
            announcement.HasKey(x => x.Id);
            announcement.Property(x => x.Title).HasMaxLength(160).IsRequired();
            announcement.Property(x => x.Content).HasMaxLength(2000).IsRequired();
            announcement.HasIndex(x => new { x.SchoolId, x.IsActive, x.PublishedAt });

            announcement.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            announcement.HasOne(x => x.CreatedBy)
                .WithMany()
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AnnouncementRead>(read =>
        {
            read.HasKey(x => new { x.AnnouncementId, x.UserId });
            read.HasIndex(x => x.UserId);

            read.HasOne(x => x.Announcement)
                .WithMany()
                .HasForeignKey(x => x.AnnouncementId)
                .OnDelete(DeleteBehavior.Cascade);

            read.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MatchSession>(match =>
        {
            match.HasKey(x => x.Id);
            match.Property(x => x.OpponentTeamName).HasMaxLength(160).IsRequired();
            match.Property(x => x.Location).HasMaxLength(200).IsRequired();
            match.HasIndex(x => new { x.SchoolId, x.IsActive, x.MatchDate });

            match.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MatchSquad>(squad =>
        {
            squad.HasKey(x => x.Id);
            squad.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            squad.HasIndex(x => new { x.MatchSessionId, x.AthleteProfileId }).IsUnique();

            squad.HasOne(x => x.MatchSession)
                .WithMany(x => x.Squad)
                .HasForeignKey(x => x.MatchSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            squad.HasOne(x => x.AthleteProfile)
                .WithMany()
                .HasForeignKey(x => x.AthleteProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AthleteMeasurement>(measurement =>
        {
            measurement.HasKey(x => x.Id);
            measurement.Property(x => x.Height).HasPrecision(5, 2);
            measurement.Property(x => x.Weight).HasPrecision(5, 2);
            measurement.HasIndex(x => new { x.AthleteProfileId, x.RecordedAt });

            measurement.HasOne(x => x.AthleteProfile)
                .WithMany()
                .HasForeignKey(x => x.AthleteProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AthleteVideo>(video =>
        {
            video.HasKey(x => x.Id);
            video.Property(x => x.StorageKey).HasMaxLength(500).IsRequired();
            video.Property(x => x.Caption).HasMaxLength(300);
            video.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            video.HasIndex(x => new { x.SchoolId, x.IsActive, x.IsPublished, x.PublishedAt });
            video.HasIndex(x => new { x.AthleteProfileId, x.CreatedAt });

            video.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            video.HasOne(x => x.AthleteProfile)
                .WithMany()
                .HasForeignKey(x => x.AthleteProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            video.HasOne(x => x.UploadedBy)
                .WithMany()
                .HasForeignKey(x => x.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
