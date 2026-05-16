using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;

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

    public DbSet<AthleteReport> AthleteReports => Set<AthleteReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<School>(school =>
        {
            school.HasKey(x => x.Id);
            school.Property(x => x.Name).HasMaxLength(160).IsRequired();
            school.Property(x => x.Code).HasMaxLength(40).IsRequired();
            school.Property(x => x.NormalizedCode).HasMaxLength(40).IsRequired();
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
            athlete.HasIndex(x => new { x.SchoolId, x.UserId }).IsUnique();

            athlete.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            athlete.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
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
            training.HasIndex(x => new { x.SchoolId, x.GroupId, x.StartsAt });

            training.HasOne(x => x.School)
                .WithMany()
                .HasForeignKey(x => x.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            training.HasOne(x => x.Group)
                .WithMany()
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Restrict);

            training.HasOne(x => x.Coach)
                .WithMany()
                .HasForeignKey(x => x.CoachId)
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
    }
}
