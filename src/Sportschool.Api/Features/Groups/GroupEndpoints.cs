using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Groups;

public static class GroupEndpoints
{
    public static RouteGroupBuilder MapGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/school/groups");

        group.MapGet("/", ListGroupsAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));
        group.MapGet("/{groupId:guid}/athletes", ListGroupAthletesAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        group.MapPost("/", CreateGroupAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));
        group.MapPut("/{groupId:guid}", UpdateGroupAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));
        group.MapDelete("/{groupId:guid}", DeactivateGroupAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));
        group.MapPost("/{groupId:guid}/athletes/{athleteProfileId:guid}", AddAthleteAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));
        group.MapDelete("/{groupId:guid}/athletes/{athleteProfileId:guid}", RemoveAthleteAsync)
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        return group;
    }

    private static async Task<IResult> ListGroupAthletesAsync(
        Guid groupId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var groupExists = await db.TrainingGroups.AnyAsync(
            x => x.Id == groupId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!groupExists)
        {
            return Results.NotFound();
        }

        var athletes = await db.GroupAthletes
            .AsNoTracking()
            .Where(x => x.GroupId == groupId
                && x.AthleteProfile.SchoolId == schoolId.Value
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive)
            .OrderBy(x => x.AthleteProfile.LastName)
            .ThenBy(x => x.AthleteProfile.FirstName)
            .Select(x => new
            {
                x.AthleteProfile.Id,
                x.AthleteProfile.FirstName,
                x.AthleteProfile.LastName,
                x.AthleteProfile.ParentFullName,
                x.AthleteProfile.ParentPhone,
                x.AthleteProfile.ProfileImageStorageKey,
                x.AthleteProfile.ProfileImageVersion
            })
            .ToListAsync(cancellationToken);

        return Results.Ok(athletes.Select(x => new GroupAthleteResponse(
            x.Id,
            x.FirstName,
            x.LastName,
            x.ParentFullName,
            x.ParentPhone,
            x.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(schoolId.Value, x.Id, x.ProfileImageVersion))));
    }

    private static async Task<IResult> ListGroupsAsync(
        string? search,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var normalizedSearch = search?.Trim();
        var groupsQuery = db.TrainingGroups
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive);

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            var searchPattern = $"%{normalizedSearch}%";
            groupsQuery = groupsQuery.Where(x => EF.Functions.Like(x.Name, searchPattern));
        }

        var groups = await groupsQuery
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.SchoolId, x.Name, x.Description, x.IsActive })
            .ToListAsync(cancellationToken);

        var groupIds = groups.Select(x => x.Id).ToArray();
        if (groupIds.Length == 0)
        {
            return Results.Ok(Array.Empty<GroupResponse>());
        }

        var athleteCounts = await db.GroupAthletes
            .AsNoTracking()
            .Where(x => groupIds.Contains(x.GroupId)
                && x.AthleteProfile.IsActive
                && x.AthleteProfile.User.IsActive)
            .GroupBy(x => x.GroupId)
            .Select(x => new { GroupId = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.GroupId, x => x.Count, cancellationToken);

        var upcomingTrainingGroups = await db.TrainingSessionGroups
            .AsNoTracking()
            .Where(x => groupIds.Contains(x.GroupId)
                && x.TrainingSession.SchoolId == schoolId.Value
                && x.TrainingSession.IsActive
                && x.TrainingSession.CompletedAt == null)
            .Select(x => new { x.GroupId, x.TrainingSession.StartsAt, x.TrainingSession.StartedAt })
            .ToListAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var upcomingTrainingCounts = upcomingTrainingGroups
            .Where(x => x.StartedAt is null && x.StartsAt >= now)
            .GroupBy(x => x.GroupId)
            .ToDictionary(x => x.Key, x => x.Count());

        return Results.Ok(groups.Select(group => new GroupResponse(
            group.Id,
            group.SchoolId,
            group.Name,
            group.Description,
            group.IsActive,
            athleteCounts.GetValueOrDefault(group.Id),
            upcomingTrainingCounts.GetValueOrDefault(group.Id))));
    }

    private static async Task<IResult> CreateGroupAsync(
        CreateGroupRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest();
        }

        var group = new TrainingGroup
        {
            SchoolId = schoolId.Value,
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim()
        };

        db.TrainingGroups.Add(group);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/school/groups/{group.Id}", GroupResponse.From(group));
    }

    private static async Task<IResult> UpdateGroupAsync(
        Guid groupId,
        UpdateGroupRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest();
        }

        var group = await db.TrainingGroups.FirstOrDefaultAsync(
            x => x.Id == groupId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (group is null)
        {
            return Results.NotFound();
        }

        group.Name = request.Name.Trim();
        group.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(GroupResponse.From(group));
    }

    private static async Task<IResult> DeactivateGroupAsync(
        Guid groupId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var group = await db.TrainingGroups.FirstOrDefaultAsync(
            x => x.Id == groupId && x.SchoolId == schoolId.Value,
            cancellationToken);

        if (group is null)
        {
            return Results.NotFound();
        }

        group.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> AddAthleteAsync(
        Guid groupId,
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var groupExists = await db.TrainingGroups.AnyAsync(
            x => x.Id == groupId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);
        var athleteExists = await db.AthleteProfiles.AnyAsync(
            x => x.Id == athleteProfileId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!groupExists || !athleteExists)
        {
            return Results.NotFound();
        }

        var membershipExists = await db.GroupAthletes.AnyAsync(
            x => x.GroupId == groupId && x.AthleteProfileId == athleteProfileId,
            cancellationToken);

        if (membershipExists)
        {
            return Results.Conflict();
        }

        db.GroupAthletes.Add(new GroupAthlete
        {
            GroupId = groupId,
            AthleteProfileId = athleteProfileId
        });
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> RemoveAthleteAsync(
        Guid groupId,
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var groupBelongsToSchool = await db.TrainingGroups.AnyAsync(
            x => x.Id == groupId && x.SchoolId == schoolId.Value,
            cancellationToken);

        if (!groupBelongsToSchool)
        {
            return Results.NotFound();
        }

        var membership = await db.GroupAthletes.FirstOrDefaultAsync(
            x => x.GroupId == groupId && x.AthleteProfileId == athleteProfileId,
            cancellationToken);

        if (membership is null)
        {
            return Results.NotFound();
        }

        db.GroupAthletes.Remove(membership);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}

public sealed record CreateGroupRequest(string Name, string? Description);

public sealed record UpdateGroupRequest(string Name, string? Description);

public sealed record GroupResponse(
    Guid Id,
    Guid SchoolId,
    string Name,
    string? Description,
    bool IsActive,
    int AthleteCount,
    int UpcomingTrainingCount)
{
    public static GroupResponse From(TrainingGroup group)
    {
        return new GroupResponse(group.Id, group.SchoolId, group.Name, group.Description, group.IsActive, 0, 0);
    }
}

public sealed record GroupAthleteResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string ParentFullName,
    string ParentPhone,
    string? ProfileImageUrl);
