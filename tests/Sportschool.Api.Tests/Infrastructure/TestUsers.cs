using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Tests.Infrastructure;

public static class TestUsers
{
    public static AppUser Create(Guid? schoolId, string email, string fullName, string password, params UserRole[] roles)
    {
        var hasher = new PasswordHasher();
        var user = new AppUser
        {
            SchoolId = schoolId,
            Email = email,
            NormalizedEmail = TextNormalizer.NormalizeEmail(email),
            FullName = fullName,
            PasswordHash = hasher.Hash(password)
        };

        foreach (var role in roles)
        {
            user.Roles.Add(new UserRoleAssignment
            {
                User = user,
                Role = role
            });
        }

        return user;
    }
}
