using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Athletes;
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
    private static readonly (string FirstName, string LastName, string ParentFirstName, string ParentLastName)[] AthleteData =
    [
        ("Ahmet",   "Yılmaz",   "Mehmet",  "Yılmaz"),
        ("Elif",    "Kaya",     "Ali",     "Kaya"),
        ("Burak",   "Demir",    "Hasan",   "Demir"),
        ("Zeynep",  "Çelik",    "İbrahim", "Çelik"),
        ("Emre",    "Şahin",    "Mustafa", "Şahin"),
        ("Selin",   "Arslan",   "Yusuf",   "Arslan"),
        ("Kaan",    "Doğan",    "Ömer",    "Doğan"),
        ("İrem",    "Aydın",    "Serkan",  "Aydın"),
        ("Mert",    "Öztürk",   "Hüseyin", "Öztürk"),
        ("Dilara",  "Koç",      "Erkan",   "Koç"),
    ];

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment() || !options.Value.Enabled)
        {
            return;
        }

        var seed = options.Value;
        await using var scope = serviceProvider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SportschoolDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();

        try
        {
            await SeedPlatformOwnerAsync(db, passwordHasher, seed, cancellationToken);
            await SeedCoachAsync(db, passwordHasher, seed, cancellationToken);
            await SeedIstanbulAthletesAsync(db, passwordHasher, seed, cancellationToken);
        }
        catch (Exception exception) when (exception is InvalidOperationException or DbUpdateException)
        {
            logger.LogWarning(exception, "Development seed was skipped because the database is not ready.");
        }
    }

    private async Task SeedPlatformOwnerAsync(
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        DevSeedOptions seed,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(seed.PlatformOwnerEmail)
            || string.IsNullOrWhiteSpace(seed.PlatformOwnerFullName)
            || string.IsNullOrWhiteSpace(seed.PlatformOwnerPassword))
        {
            logger.LogWarning("Development PlatformOwner seed was skipped because its credentials are incomplete.");
            return;
        }

        var normalizedEmail = TextNormalizer.NormalizeEmail(seed.PlatformOwnerEmail);
        var exists = await db.Users
            .AnyAsync(x => x.SchoolId == null
                && x.NormalizedEmail == normalizedEmail
                && x.Roles.Any(role => role.Role == UserRole.PlatformOwner),
                cancellationToken);

        if (exists)
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

        user.Roles.Add(new UserRoleAssignment { User = user, Role = UserRole.PlatformOwner });

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded development PlatformOwner user {Email}.", user.Email);
    }

    private async Task SeedCoachAsync(
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        DevSeedOptions seed,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(seed.CoachSchoolCode)
            || string.IsNullOrWhiteSpace(seed.CoachEmail)
            || string.IsNullOrWhiteSpace(seed.CoachFullName)
            || string.IsNullOrWhiteSpace(seed.CoachPassword))
        {
            logger.LogWarning("Development seed is enabled but Coach seed credentials are incomplete.");
            return;
        }

        var normalizedSchoolCode = TextNormalizer.NormalizeSchoolCode(seed.CoachSchoolCode);
        var school = await db.Schools
            .FirstOrDefaultAsync(x => x.NormalizedCode == normalizedSchoolCode && x.IsActive, cancellationToken);

        if (school is null)
        {
            logger.LogWarning("Development Coach seed was skipped because school {SchoolCode} was not found.", seed.CoachSchoolCode);
            return;
        }

        var normalizedEmail = TextNormalizer.NormalizeEmail(seed.CoachEmail);
        var coach = await db.Users
            .Include(x => x.Roles)
            .FirstOrDefaultAsync(
                x => x.SchoolId == school.Id && x.NormalizedEmail == normalizedEmail,
                cancellationToken);

        if (coach is null)
        {
            coach = new AppUser
            {
                SchoolId = school.Id,
                Email = seed.CoachEmail.Trim(),
                NormalizedEmail = normalizedEmail,
                FullName = seed.CoachFullName.Trim(),
                PasswordHash = passwordHasher.Hash(seed.CoachPassword)
            };

            coach.Roles.Add(new UserRoleAssignment { User = coach, Role = UserRole.Coach });
            db.Users.Add(coach);
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Seeded development Coach user {Email} for school {SchoolCode}.", coach.Email, school.Code);
            return;
        }

        coach.Email = seed.CoachEmail.Trim();
        coach.NormalizedEmail = normalizedEmail;
        coach.FullName = seed.CoachFullName.Trim();
        coach.PasswordHash = passwordHasher.Hash(seed.CoachPassword);
        coach.IsActive = true;

        if (!coach.Roles.Any(x => x.Role == UserRole.Coach))
        {
            coach.Roles.Add(new UserRoleAssignment { User = coach, Role = UserRole.Coach });
        }

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Updated development Coach user {Email} for school {SchoolCode}.", coach.Email, school.Code);
    }

    private async Task SeedIstanbulAthletesAsync(
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        DevSeedOptions seed,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(seed.AthletePassword))
        {
            logger.LogWarning("Development athlete seed was skipped because its password is not configured.");
            return;
        }

        var normalizedCode = TextNormalizer.NormalizeSchoolCode("istanbul");
        var school = await db.Schools
            .FirstOrDefaultAsync(x => x.NormalizedCode == normalizedCode && x.IsActive, cancellationToken);

        if (school is null)
        {
            return;
        }

        var existingAthleteCount = await db.AthleteProfiles
            .CountAsync(x => x.SchoolId == school.Id, cancellationToken);

        if (existingAthleteCount >= AthleteData.Length)
        {
            return;
        }

        var defaultPassword = passwordHasher.Hash(seed.AthletePassword);
        var random = new Random(42);
        var today = DateOnly.FromDateTime(DateTime.Today);

        foreach (var (firstName, lastName, parentFirstName, parentLastName) in AthleteData)
        {
            var email = $"{firstName.ToLower()}.{lastName.ToLower()}@istanbul.com"
                .Replace("ı", "i").Replace("ğ", "g").Replace("ü", "u")
                .Replace("ş", "s").Replace("ö", "o").Replace("ç", "c")
                .Replace("İ", "I").Replace("Ğ", "G").Replace("Ü", "U")
                .Replace("Ş", "S").Replace("Ö", "O").Replace("Ç", "C");

            var normalizedEmail = TextNormalizer.NormalizeEmail(email);
            var alreadyExists = await db.Users.AnyAsync(
                x => x.SchoolId == school.Id && x.NormalizedEmail == normalizedEmail,
                cancellationToken);

            if (alreadyExists)
            {
                continue;
            }

            var ageYears = random.Next(8, 18);
            var birthDate = today.AddYears(-ageYears).AddDays(-random.Next(0, 365));

            var athlete = new AppUser
            {
                SchoolId = school.Id,
                Email = email,
                NormalizedEmail = normalizedEmail,
                FullName = $"{firstName} {lastName}",
                PasswordHash = defaultPassword
            };

            athlete.Roles.Add(new UserRoleAssignment { User = athlete, Role = UserRole.Athlete });
            athlete.Roles.Add(new UserRoleAssignment { User = athlete, Role = UserRole.Parent });

            var profile = new AthleteProfile
            {
                SchoolId = school.Id,
                User = athlete,
                FirstName = firstName,
                LastName = lastName,
                BirthDate = birthDate,
                ParentFullName = $"{parentFirstName} {parentLastName}",
                ParentPhone = $"05{random.Next(300, 600):000}{random.Next(0, 1000000):000000}"
            };

            db.Users.Add(athlete);
            db.AthleteProfiles.Add(profile);

            logger.LogInformation("Seeded athlete {FullName} for school istanbul.", athlete.FullName);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
