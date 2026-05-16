using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.SchoolManagement;

public static class SchoolManagementEndpoints
{
    public static RouteGroupBuilder MapSchoolManagementEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        group.MapPost("/coaches", UpsertCoachAsync);

        return group;
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
}

public sealed record CreateCoachRequest(string Email, string FullName);

public sealed record CoachResponse(Guid Id, Guid SchoolId, string Email, string FullName, string? TemporaryPassword)
{
    public static CoachResponse From(AppUser user, string? temporaryPassword)
    {
        return new CoachResponse(user.Id, user.SchoolId!.Value, user.Email, user.FullName, temporaryPassword);
    }
}
