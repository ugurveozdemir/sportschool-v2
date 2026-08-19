using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Bootstrap;

public sealed class PlatformOwnerMaintenance(
    SportschoolDbContext db,
    PasswordHasher passwordHasher)
{
    public async Task<AppUser> ProvisionAsync(
        string? email,
        string? fullName,
        string? password,
        CancellationToken cancellationToken = default)
    {
        if (!RequestValidation.HasValidEmail(email)
            || !RequestValidation.HasRequiredText(fullName, maximumLength: 160)
            || !RequestValidation.HasValidPassword(password))
        {
            throw new InvalidOperationException("PlatformOwner provisioning values are invalid.");
        }

        if (await db.UserRoles.AnyAsync(x => x.Role == UserRole.PlatformOwner, cancellationToken))
        {
            throw new InvalidOperationException("A PlatformOwner account already exists.");
        }

        var normalizedEmail = TextNormalizer.NormalizeEmail(email!);
        if (await db.Users.AnyAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken))
        {
            throw new InvalidOperationException("The PlatformOwner email is already in use.");
        }

        var user = new AppUser
        {
            Email = email!.Trim(),
            NormalizedEmail = normalizedEmail,
            FullName = fullName!.Trim(),
            PasswordHash = passwordHasher.Hash(password!)
        };
        user.Roles.Add(new UserRoleAssignment { User = user, Role = UserRole.PlatformOwner });

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<AppUser> ResetPasswordAsync(
        string? email,
        string? password,
        CancellationToken cancellationToken = default)
    {
        if (!RequestValidation.HasValidEmail(email) || !RequestValidation.HasValidPassword(password))
        {
            throw new InvalidOperationException("PlatformOwner password reset values are invalid.");
        }

        var normalizedEmail = TextNormalizer.NormalizeEmail(email!);
        var user = await db.Users
            .Include(x => x.Roles)
            .Include(x => x.RefreshTokens)
            .SingleOrDefaultAsync(
                x => x.SchoolId == null
                    && x.NormalizedEmail == normalizedEmail
                    && x.Roles.Any(role => role.Role == UserRole.PlatformOwner),
                cancellationToken);
        if (user is null)
        {
            throw new InvalidOperationException("The PlatformOwner account was not found.");
        }

        user.PasswordHash = passwordHasher.Hash(password!);
        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var token in user.RefreshTokens.Where(x => x.IsActive))
        {
            token.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);
        return user;
    }
}
