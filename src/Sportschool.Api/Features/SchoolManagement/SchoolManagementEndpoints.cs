using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.SchoolManagement;

public static class SchoolManagementEndpoints
{
    public static RouteGroupBuilder MapSchoolManagementEndpoints(this IEndpointRouteBuilder app)
    {
        var adminGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        adminGroup.MapGet("/users", ListUsersAsync);
        adminGroup.MapGet("/coaches", ListCoachesAsync);
        adminGroup.MapPost("/coaches", UpsertCoachAsync);
        adminGroup.MapDelete("/users/{userId:guid}", DeactivateUserAsync);

        var staffGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        staffGroup.MapGet("/athletes", ListAthletesAsync);
        staffGroup.MapDelete("/athletes/{athleteProfileId:guid}", DeactivateAthleteAsync);

        return adminGroup;
    }

    private static async Task<IResult> ListUsersAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var users = await db.Users
            .AsNoTracking()
            .Include(x => x.Roles)
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive)
            .OrderBy(x => x.FullName)
            .ToListAsync(cancellationToken);

        return Results.Ok(users.Select(SchoolUserResponse.From));
    }

    private static async Task<IResult> ListCoachesAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var coaches = await db.Users
            .AsNoTracking()
            .Include(x => x.Roles)
            .Where(x => x.SchoolId == schoolId.Value
                && x.IsActive
                && x.Roles.Any(role => role.Role == UserRole.Coach))
            .OrderBy(x => x.FullName)
            .ToListAsync(cancellationToken);

        return Results.Ok(coaches.Select(SchoolUserResponse.From));
    }

    private static async Task<IResult> ListAthletesAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var athletes = await db.AthleteProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive && x.User.IsActive)
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ToListAsync(cancellationToken);

        return Results.Ok(athletes.Select(AthleteRosterResponse.From));
    }

    private static async Task<IResult> UpsertCoachAsync(
        CreateCoachRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        TemporaryPasswordGenerator passwordGenerator,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.FullName))
        {
            return Results.BadRequest();
        }

        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var schoolIsActive = await db.Schools.AnyAsync(
            x => x.Id == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!schoolIsActive)
        {
            return Results.Forbid();
        }

        var normalizedEmail = TextNormalizer.NormalizeEmail(request.Email);
        var existingUser = await db.Users
            .Include(x => x.Roles)
            .FirstOrDefaultAsync(
                x => x.SchoolId == schoolId.Value && x.NormalizedEmail == normalizedEmail,
                cancellationToken);

        if (existingUser is not null)
        {
            if (!existingUser.IsActive)
            {
                return Results.Conflict();
            }

            if (existingUser.Roles.Any(x => x.Role == UserRole.Coach))
            {
                return Results.Conflict();
            }

            existingUser.Roles.Add(new UserRoleAssignment
            {
                UserId = existingUser.Id,
                Role = UserRole.Coach
            });
            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(CoachResponse.From(existingUser, temporaryPassword: null));
        }

        var temporaryPassword = passwordGenerator.Create();
        var coach = new AppUser
        {
            SchoolId = schoolId.Value,
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = passwordHasher.Hash(temporaryPassword)
        };

        coach.Roles.Add(new UserRoleAssignment
        {
            User = coach,
            Role = UserRole.Coach
        });

        db.Users.Add(coach);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/school/coaches/{coach.Id}", CoachResponse.From(coach, temporaryPassword));
    }

    private static async Task<IResult> DeactivateUserAsync(
        Guid userId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var currentUserId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || currentUserId is null)
        {
            return Results.Forbid();
        }

        if (userId == currentUserId.Value)
        {
            return Results.BadRequest();
        }

        var user = await db.Users
            .Include(x => x.RefreshTokens)
            .FirstOrDefaultAsync(x => x.Id == userId && x.SchoolId == schoolId.Value && x.IsActive, cancellationToken);

        if (user is null)
        {
            return Results.NotFound();
        }

        user.IsActive = false;
        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var token in user.RefreshTokens.Where(t => t.IsActive))
        {
            token.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeactivateAthleteAsync(
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

        var profile = await db.AthleteProfiles
            .Include(x => x.User)
            .ThenInclude(u => u.RefreshTokens)
            .FirstOrDefaultAsync(x => x.Id == athleteProfileId && x.SchoolId == schoolId.Value && x.IsActive, cancellationToken);

        if (profile is null)
        {
            return Results.NotFound();
        }

        profile.IsActive = false;
        profile.User.IsActive = false;

        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var token in profile.User.RefreshTokens.Where(t => t.IsActive))
        {
            token.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}

public sealed record CreateCoachRequest(string Email, string FullName);

public sealed record SchoolUserResponse(Guid Id, Guid SchoolId, string Email, string FullName, UserRole[] Roles)
{
    public static SchoolUserResponse From(AppUser user)
    {
        return new SchoolUserResponse(
            user.Id,
            user.SchoolId!.Value,
            user.Email,
            user.FullName,
            user.Roles.Select(x => x.Role).Order().ToArray());
    }
}

public sealed record AthleteRosterResponse(
    Guid Id,
    Guid SchoolId,
    Guid UserId,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    string ParentFullName,
    string ParentPhone)
{
    public static AthleteRosterResponse From(AthleteProfile athlete)
    {
        return new AthleteRosterResponse(
            athlete.Id,
            athlete.SchoolId,
            athlete.UserId,
            athlete.FirstName,
            athlete.LastName,
            athlete.BirthDate,
            athlete.ParentFullName,
            athlete.ParentPhone);
    }
}

public sealed record CoachResponse(Guid Id, Guid SchoolId, string Email, string FullName, string? TemporaryPassword)
{
    public static CoachResponse From(AppUser user, string? temporaryPassword)
    {
        return new CoachResponse(user.Id, user.SchoolId!.Value, user.Email, user.FullName, temporaryPassword);
    }
}
