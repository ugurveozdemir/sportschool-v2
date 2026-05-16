using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Groups;

public static class GroupEndpoints
{
    public static RouteGroupBuilder MapGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/school/groups")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        group.MapGet("/", ListGroupsAsync);
        group.MapPost("/", CreateGroupAsync);
        group.MapPut("/{groupId:guid}", UpdateGroupAsync);
        group.MapDelete("/{groupId:guid}", DeactivateGroupAsync);
        group.MapPost("/{groupId:guid}/athletes/{athleteProfileId:guid}", AddAthleteAsync);
        group.MapDelete("/{groupId:guid}/athletes/{athleteProfileId:guid}", RemoveAthleteAsync);

        return group;
    }

    private static async Task<IResult> ListGroupsAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var groups = await db.TrainingGroups
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => GroupResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(groups);
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

public sealed record GroupResponse(Guid Id, Guid SchoolId, string Name, string? Description, bool IsActive)
{
    public static GroupResponse From(TrainingGroup group)
    {
        return new GroupResponse(group.Id, group.SchoolId, group.Name, group.Description, group.IsActive);
    }
}
