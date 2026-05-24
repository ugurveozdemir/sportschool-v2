using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Bootstrap;

public sealed class DevSeedHostedService(
    IServiceProvider serviceProvider,
    IHostEnvironment environment,
    IOptions<DevSeedOptions> options,
    ILogger<DevSeedHostedService> logger)
    : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment() || !options.Value.Enabled)
        {
            return;
        }

        var seed = options.Value;
        if (string.IsNullOrWhiteSpace(seed.PlatformOwnerEmail)
            || string.IsNullOrWhiteSpace(seed.PlatformOwnerFullName)
            || string.IsNullOrWhiteSpace(seed.PlatformOwnerPassword))
        {
            logger.LogWarning("Development seed is enabled but PlatformOwner seed credentials are incomplete.");
            return;
        }

        await using var scope = serviceProvider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();

        try
        {
            var normalizedEmail = TextNormalizer.NormalizeEmail(seed.PlatformOwnerEmail);
            var configuredPlatformOwnerExists = await db.Users
                .AnyAsync(x => x.SchoolId == null
                    && x.NormalizedEmail == normalizedEmail
                    && x.Roles.Any(role => role.Role == UserRole.PlatformOwner),
                    cancellationToken);

            if (configuredPlatformOwnerExists)
            {
                return;
            }

            var user = new AppUser
            {
                Email = seed.PlatformOwnerEmail.Trim(),
                NormalizedEmail = normalizedEmail,
                FullName = seed.PlatformOwnerFullName.Trim(),
                PasswordHash = passwordHasher.Hash(seed.PlatformOwnerPassword)
            };

            user.Roles.Add(new UserRoleAssignment
            {
                User = user,
                Role = UserRole.PlatformOwner
            });

            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Seeded development PlatformOwner user {Email}.", user.Email);
        }
        catch (Exception exception) when (exception is InvalidOperationException or DbUpdateException)
        {
            logger.LogWarning(exception, "Development seed was skipped because the database is not ready.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
