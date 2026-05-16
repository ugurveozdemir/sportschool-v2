using System.Security.Claims;

namespace Sportschool.Api.Security;

public static class CurrentUser
{
    public static Guid? GetUserId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");

        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    public static Guid? GetSchoolId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("school_id");
        return Guid.TryParse(value, out var schoolId) ? schoolId : null;
    }
}
