using System.Security.Claims;

namespace Sportschool.Api.Security;

public static class CurrentUser
{
    public static Guid? GetSchoolId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("school_id");
        return Guid.TryParse(value, out var schoolId) ? schoolId : null;
    }
}
