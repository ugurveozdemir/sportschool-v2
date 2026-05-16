using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Platform;

public static class PlatformEndpoints
{
    public static RouteGroupBuilder MapPlatformEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/platform")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.PlatformOwner.ToString()));

        group.MapPost("/schools", CreateSchoolAsync);
        group.MapDelete("/schools/{schoolId:guid}", DeactivateSchoolAsync);
        group.MapPost("/schools/{schoolId:guid}/admins", CreateSchoolAdminAsync);

        return group;
    }

    private static async Task<IResult> CreateSchoolAsync(
        CreateSchoolRequest request,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            return Results.BadRequest();
        }

        var normalizedCode = TextNormalizer.NormalizeSchoolCode(request.Code);
        var codeExists = await db.Schools.AnyAsync(x => x.NormalizedCode == normalizedCode, cancellationToken);
        if (codeExists)
        {
            return Results.Conflict();
        }

        var school = new School
        {
            Name = request.Name.Trim(),
            Code = request.Code.Trim(),
            NormalizedCode = normalizedCode
        };

        db.Schools.Add(school);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/platform/schools/{school.Id}", SchoolResponse.From(school));
    }

    private static async Task<IResult> DeactivateSchoolAsync(
        Guid schoolId,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var school = await db.Schools.FirstOrDefaultAsync(x => x.Id == schoolId, cancellationToken);
        if (school is null)
        {
            return Results.NotFound();
        }

        school.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> CreateSchoolAdminAsync(
        Guid schoolId,
        CreateSchoolAdminRequest request,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        TemporaryPasswordGenerator passwordGenerator,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.FullName))
        {
            return Results.BadRequest();
        }

        var school = await db.Schools.FirstOrDefaultAsync(x => x.Id == schoolId && x.IsActive, cancellationToken);
        if (school is null)
        {
            return Results.NotFound();
        }

        var normalizedEmail = TextNormalizer.NormalizeEmail(request.Email);
        var emailExists = await db.Users.AnyAsync(
            x => x.SchoolId == schoolId && x.NormalizedEmail == normalizedEmail,
            cancellationToken);

        if (emailExists)
        {
            return Results.Conflict();
        }

        var temporaryPassword = passwordGenerator.Create();
        var user = new AppUser
        {
            SchoolId = schoolId,
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = passwordHasher.Hash(temporaryPassword)
        };

        user.Roles.Add(new UserRoleAssignment
        {
            User = user,
            Role = UserRole.SchoolAdmin
        });

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/platform/schools/{schoolId}/admins/{user.Id}",
            SchoolAdminResponse.From(user, temporaryPassword));
    }
}

public sealed record CreateSchoolRequest(string Name, string Code);

public sealed record SchoolResponse(Guid Id, string Name, string Code, bool IsActive)
{
    public static SchoolResponse From(School school)
    {
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive);
    }
}

public sealed record CreateSchoolAdminRequest(string Email, string FullName);

public sealed record SchoolAdminResponse(Guid Id, Guid SchoolId, string Email, string FullName, string TemporaryPassword)
{
    public static SchoolAdminResponse From(AppUser user, string temporaryPassword)
    {
        return new SchoolAdminResponse(user.Id, user.SchoolId!.Value, user.Email, user.FullName, temporaryPassword);
    }
}
