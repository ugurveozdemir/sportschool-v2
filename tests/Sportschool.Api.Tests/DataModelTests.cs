using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Applications;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Auth;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;

namespace Sportschool.Api.Tests;

public sealed class DataModelTests
{
    [Fact]
    public void UserEmail_IsUniqueWithinSchoolOnly()
    {
        using var db = CreateDbContext();

        var user = db.Model.FindEntityType(typeof(AppUser));
        var index = Assert.Single(user!.GetIndexes(), x =>
            x.Properties.Select(p => p.Name).SequenceEqual([nameof(AppUser.SchoolId), nameof(AppUser.NormalizedEmail)]));

        Assert.True(index.IsUnique);
    }

    [Fact]
    public void UserRoles_UseCompositeKey()
    {
        using var db = CreateDbContext();

        var role = db.Model.FindEntityType(typeof(UserRoleAssignment));
        var keyProperties = role!.FindPrimaryKey()!.Properties.Select(x => x.Name);

        Assert.Equal([nameof(UserRoleAssignment.UserId), nameof(UserRoleAssignment.Role)], keyProperties);
    }

    [Fact]
    public void PlatformOwnerEmail_IsGloballyUnique()
    {
        using var db = CreateDbContext();

        var user = db.Model.FindEntityType(typeof(AppUser));
        var index = Assert.Single(user!.GetIndexes(), x =>
            x.Properties.Select(p => p.Name).SequenceEqual([nameof(AppUser.NormalizedEmail)]));

        Assert.True(index.IsUnique);
        Assert.Equal("\"SchoolId\" IS NULL", index.GetFilter());
    }

    [Fact]
    public void RefreshTokenHash_IsUnique()
    {
        using var db = CreateDbContext();

        var refreshToken = db.Model.FindEntityType(typeof(RefreshToken));
        var index = Assert.Single(refreshToken!.GetIndexes(), x =>
            x.Properties.Select(p => p.Name).SequenceEqual([nameof(RefreshToken.TokenHash)]));

        Assert.True(index.IsUnique);
    }

    [Fact]
    public void AthleteProfile_IsUniquePerUserWithinSchool()
    {
        using var db = CreateDbContext();

        var athleteProfile = db.Model.FindEntityType(typeof(AthleteProfile));
        var index = Assert.Single(athleteProfile!.GetIndexes(), x =>
            x.Properties.Select(p => p.Name).SequenceEqual([nameof(AthleteProfile.SchoolId), nameof(AthleteProfile.UserId)]));

        Assert.True(index.IsUnique);
    }

    [Fact]
    public void AthleteApplication_TracksPendingDuplicatesBySchoolEmailAndStatus()
    {
        using var db = CreateDbContext();

        var application = db.Model.FindEntityType(typeof(AthleteApplication));
        var index = Assert.Single(application!.GetIndexes(), x =>
            x.Properties.Select(p => p.Name).SequenceEqual(
            [
                nameof(AthleteApplication.SchoolId),
                nameof(AthleteApplication.NormalizedAthleteEmail),
                nameof(AthleteApplication.Status)
            ]));

        Assert.False(index.IsUnique);
    }

    [Fact]
    public void GroupMembership_IsUniquePerGroupAndAthlete()
    {
        using var db = CreateDbContext();

        var membership = db.Model.FindEntityType(typeof(GroupAthlete));
        var keyProperties = membership!.FindPrimaryKey()!.Properties.Select(x => x.Name);

        Assert.Equal([nameof(GroupAthlete.GroupId), nameof(GroupAthlete.AthleteProfileId)], keyProperties);
    }

    [Fact]
    public void TrainingSessions_AreIndexedBySchoolGroupAndStartTime()
    {
        using var db = CreateDbContext();

        var training = db.Model.FindEntityType(typeof(TrainingSession));
        var index = Assert.Single(training!.GetIndexes(), x =>
            x.Properties.Select(p => p.Name).SequenceEqual(
            [
                nameof(TrainingSession.SchoolId),
                nameof(TrainingSession.GroupId),
                nameof(TrainingSession.StartsAt)
            ]));

        Assert.False(index.IsUnique);
    }

    [Fact]
    public void AthleteReportScores_UseSingleDecimalPrecision()
    {
        using var db = CreateDbContext();

        var report = db.Model.FindEntityType(typeof(AthleteReport));
        var speedScore = report!.FindProperty(nameof(AthleteReport.SpeedScore))!;

        Assert.Equal(3, speedScore.GetPrecision());
        Assert.Equal(1, speedScore.GetScale());
    }

    private static SportschoolDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<SportschoolDbContext>()
            .UseNpgsql("Host=localhost;Database=sportschool_tests;Username=sportschool;Password=sportschool")
            .Options;

        return new SportschoolDbContext(options);
    }
}
