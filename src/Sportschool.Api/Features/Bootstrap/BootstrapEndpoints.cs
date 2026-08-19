using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Bootstrap;

public static class BootstrapEndpoints
{
    public static RouteGroupBuilder MapBootstrapEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/bootstrap");

        group.MapPost("/platform-owner", CreatePlatformOwnerAsync);

        return group;
    }

    private static async Task<IResult> CreatePlatformOwnerAsync(
        CreatePlatformOwnerRequest request,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        CancellationToken cancellationToken)
    {
        if (!RequestValidation.HasValidEmail(request.Email)
            || !RequestValidation.HasRequiredText(request.FullName, maximumLength: 160)
            || !RequestValidation.HasValidPassword(request.Password))
        {
            return Results.BadRequest();
        }

        var hasPlatformOwner = await db.UserRoles
            .AnyAsync(x => x.Role == UserRole.PlatformOwner, cancellationToken);

        if (hasPlatformOwner)
        {
            return Results.Conflict();
        }

        var user = new AppUser
        {
            Email = request.Email.Trim(),
            NormalizedEmail = TextNormalizer.NormalizeEmail(request.Email),
            FullName = request.FullName.Trim(),
            PasswordHash = passwordHasher.Hash(request.Password)
        };

        user.Roles.Add(new UserRoleAssignment
        {
            User = user,
            Role = UserRole.PlatformOwner
        });

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/platform/users/{user.Id}", new PlatformOwnerResponse(user.Id, user.Email, user.FullName));
    }
}

public sealed record CreatePlatformOwnerRequest(string Email, string FullName, string Password);

public sealed record PlatformOwnerResponse(Guid Id, string Email, string FullName);
