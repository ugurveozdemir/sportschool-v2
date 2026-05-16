using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Schools;
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
    }
}
