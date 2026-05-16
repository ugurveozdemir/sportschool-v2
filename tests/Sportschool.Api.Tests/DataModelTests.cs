using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Auth;
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

    private static SportschoolDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<SportschoolDbContext>()
            .UseNpgsql("Host=localhost;Database=sportschool_tests;Username=sportschool;Password=sportschool")
            .Options;

        return new SportschoolDbContext(options);
    }
}
