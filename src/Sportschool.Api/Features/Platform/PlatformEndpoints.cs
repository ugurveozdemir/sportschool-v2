using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Platform;

public static class PlatformEndpoints
{
    private const int MinimumPasswordLength = 8;

    public static RouteGroupBuilder MapPlatformEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/platform")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.PlatformOwner.ToString()));

        group.MapGet("/schools", ListSchoolsAsync);
        group.MapPost("/schools", CreateSchoolAsync);
        group.MapPut("/schools/{schoolId:guid}", UpdateSchoolAsync);
        group.MapDelete("/schools/{schoolId:guid}", DeactivateSchoolAsync);
        group.MapGet("/schools/{schoolId:guid}/admins", ListSchoolAdminsAsync);
        group.MapPost("/schools/{schoolId:guid}/admins", CreateSchoolAdminAsync);
        group.MapPut("/schools/{schoolId:guid}/admins/{adminId:guid}/password", UpdateSchoolAdminPasswordAsync);
        group.MapDelete("/schools/{schoolId:guid}/admins/{adminId:guid}", RemoveSchoolAdminAsync);

        return group;
    }

    private static async Task<IResult> ListSchoolsAsync(
        string? search,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var query = db.Schools.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(x =>
                x.Name.ToLower().Contains(normalizedSearch) ||
                x.Code.ToLower().Contains(normalizedSearch));
        }

        var schools = await query
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return Results.Ok(schools.Select(SchoolResponse.From));
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

    private static async Task<IResult> UpdateSchoolAsync(
        Guid schoolId,
        UpdateSchoolRequest request,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest();
        }

        var school = await db.Schools.FirstOrDefaultAsync(x => x.Id == schoolId, cancellationToken);
        if (school is null)
        {
            return Results.NotFound();
        }

        school.Name = request.Name.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(SchoolResponse.From(school));
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

        var revokedAt = DateTimeOffset.UtcNow;
        var schoolUsers = await db.Users
            .Include(user => user.RefreshTokens)
            .Where(user => user.SchoolId == schoolId)
            .ToListAsync(cancellationToken);

        school.IsActive = false;
        foreach (var refreshToken in schoolUsers
            .SelectMany(user => user.RefreshTokens)
            .Where(token => token.IsActive))
        {
            refreshToken.RevokedAt = revokedAt;
        }
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> CreateSchoolAdminAsync(
        Guid schoolId,
        CreateSchoolAdminRequest request,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.FullName)
            || string.IsNullOrWhiteSpace(request.Password)
            || request.Password.Length < MinimumPasswordLength)
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

        var user = new AppUser
        {
            SchoolId = schoolId,
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = passwordHasher.Hash(request.Password)
        };

        user.Roles.Add(new UserRoleAssignment { User = user, Role = UserRole.SchoolAdmin });
        user.Roles.Add(new UserRoleAssignment { User = user, Role = UserRole.Coach });

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/platform/schools/{schoolId}/admins/{user.Id}",
            PlatformSchoolAdminResponse.From(user));
    }

    private static async Task<IResult> UpdateSchoolAdminPasswordAsync(
        Guid schoolId,
        Guid adminId,
        UpdateSchoolAdminPasswordRequest request,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < MinimumPasswordLength)
        {
            return Results.BadRequest();
        }

        var admin = await db.Users
            .Include(x => x.Roles)
            .Include(x => x.RefreshTokens)
            .FirstOrDefaultAsync(
                x => x.Id == adminId
                    && x.SchoolId == schoolId
                    && x.IsActive
                    && x.Roles.Any(role => role.Role == UserRole.SchoolAdmin),
                cancellationToken);

        if (admin is null)
        {
            return Results.NotFound();
        }

        admin.PasswordHash = passwordHasher.Hash(request.Password);
        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var refreshToken in admin.RefreshTokens.Where(x => x.IsActive))
        {
            refreshToken.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> ListSchoolAdminsAsync(
        Guid schoolId,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolExists = await db.Schools.AnyAsync(x => x.Id == schoolId, cancellationToken);
        if (!schoolExists)
        {
            return Results.NotFound();
        }

        var admins = await db.Users
            .AsNoTracking()
            .Include(x => x.Roles)
            .Where(x => x.SchoolId == schoolId
                && x.IsActive
                && x.Roles.Any(role => role.Role == UserRole.SchoolAdmin))
            .OrderBy(x => x.FullName)
            .ToListAsync(cancellationToken);

        return Results.Ok(admins.Select(PlatformSchoolAdminResponse.From));
    }

    private static async Task<IResult> RemoveSchoolAdminAsync(
        Guid schoolId,
        Guid adminId,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var admin = await db.Users
            .Include(x => x.Roles)
            .Include(x => x.RefreshTokens)
            .FirstOrDefaultAsync(
                x => x.Id == adminId
                    && x.SchoolId == schoolId
                    && x.IsActive
                    && x.Roles.Any(role => role.Role == UserRole.SchoolAdmin),
                cancellationToken);

        if (admin is null)
        {
            return Results.NotFound();
        }

        admin.IsActive = false;
        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var refreshToken in admin.RefreshTokens.Where(x => x.IsActive))
        {
            refreshToken.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}

public sealed record CreateSchoolRequest(string Name, string Code);
public sealed record UpdateSchoolRequest(string Name);

public sealed record SchoolResponse(Guid Id, string Name, string Code, bool IsActive)
{
    public static SchoolResponse From(School school)
    {
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive);
    }
}

public sealed record CreateSchoolAdminRequest(string Email, string FullName, string Password);

public sealed record UpdateSchoolAdminPasswordRequest(string Password);

public sealed record PlatformSchoolAdminResponse(Guid Id, Guid SchoolId, string Email, string FullName)
{
    public static PlatformSchoolAdminResponse From(AppUser user)
    {
        return new PlatformSchoolAdminResponse(user.Id, user.SchoolId!.Value, user.Email, user.FullName);
    }
}
