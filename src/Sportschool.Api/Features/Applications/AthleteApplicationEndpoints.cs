using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Applications;

public static class AthleteApplicationEndpoints
{
    private const int ApplicationAttemptLimit = 5;
    private static readonly TimeSpan ApplicationAttemptWindow = TimeSpan.FromMinutes(10);

    public static RouteGroupBuilder MapAthleteApplicationEndpoints(this IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/applications");
        publicGroup.MapPost("/athletes", CreateApplicationAsync);

        var schoolGroup = app.MapGroup("/api/school/athlete-applications")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        schoolGroup.MapGet("/", ListApplicationsAsync);
        schoolGroup.MapPost("/{applicationId:guid}/approve", ApproveApplicationAsync);
        schoolGroup.MapPost("/{applicationId:guid}/reject", RejectApplicationAsync);

        return publicGroup;
    }

    private static async Task<IResult> CreateApplicationAsync(
        CreateAthleteApplicationRequest request,
        HttpContext httpContext,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        KeyedRequestLimiter requestLimiter,
        CancellationToken cancellationToken)
    {
        if (!RequestValidation.HasRequiredText(request.SchoolCode, maximumLength: 40)
            || !RequestValidation.HasRequiredText(request.AthleteFirstName, maximumLength: 80)
            || !RequestValidation.HasRequiredText(request.AthleteLastName, maximumLength: 80)
            || !RequestValidation.HasValidEmail(request.AthleteEmail)
            || !RequestValidation.HasValidPassword(request.Password)
            || !RequestValidation.HasRequiredText(request.ParentFullName, maximumLength: 160)
            || !RequestValidation.HasRequiredText(request.ParentPhone, maximumLength: 40)
            || !RequestValidation.HasValidEmail(request.ParentEmail)
            || !RequestValidation.HasValidBirthDate(request.AthleteBirthDate))
        {
            return Results.BadRequest();
        }

        var normalizedSchoolCode = TextNormalizer.NormalizeSchoolCode(request.SchoolCode);
        var normalizedEmail = TextNormalizer.NormalizeEmail(request.AthleteEmail);
        var normalizedParentEmail = TextNormalizer.NormalizeEmail(request.ParentEmail);
        if (normalizedEmail == normalizedParentEmail)
        {
            return Results.BadRequest();
        }

        var rateLimitKey = $"athlete-application:{normalizedSchoolCode}:{normalizedEmail}";
        if (!requestLimiter.TryAcquire(rateLimitKey, ApplicationAttemptLimit, ApplicationAttemptWindow, out var retryAfterSeconds))
        {
            httpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
            return Results.Json(
                new { message = "Too many application attempts. Please try again later." },
                statusCode: StatusCodes.Status429TooManyRequests);
        }

        var school = await db.Schools.FirstOrDefaultAsync(
            x => x.NormalizedCode == normalizedSchoolCode && x.IsActive,
            cancellationToken);

        if (school is null)
        {
            return Results.NotFound();
        }

        var userExists = await db.Users.AnyAsync(
            x => x.SchoolId == school.Id && x.NormalizedEmail == normalizedEmail,
            cancellationToken);

        if (userExists)
        {
            return Results.Conflict();
        }

        var activeApplicationExists = await db.AthleteApplications.AnyAsync(
            x => x.SchoolId == school.Id
                && x.NormalizedAthleteEmail == normalizedEmail
                && x.Status == AthleteApplicationStatus.Pending,
            cancellationToken);

        if (activeApplicationExists)
        {
            return Results.Conflict();
        }

        var application = new AthleteApplication
        {
            SchoolId = school.Id,
            AthleteFirstName = request.AthleteFirstName.Trim(),
            AthleteLastName = request.AthleteLastName.Trim(),
            AthleteBirthDate = request.AthleteBirthDate,
            AthleteEmail = request.AthleteEmail.Trim(),
            NormalizedAthleteEmail = normalizedEmail,
            PasswordHash = passwordHasher.Hash(request.Password),
            ParentFullName = request.ParentFullName.Trim(),
            ParentPhone = request.ParentPhone.Trim(),
            ParentEmail = request.ParentEmail.Trim(),
            NormalizedParentEmail = normalizedParentEmail
        };

        db.AthleteApplications.Add(application);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/applications/athletes/{application.Id}", AthleteApplicationResponse.From(application));
    }

    private static async Task<IResult> ListApplicationsAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var applications = await db.AthleteApplications
            .Where(x => x.SchoolId == schoolId.Value)
            .OrderByDescending(x => x.CreatedAt)
            .Take(RequestValidation.MaxUnpagedItems)
            .Select(x => AthleteApplicationResponse.From(x))
            .ToListAsync(cancellationToken);

        return Results.Ok(applications);
    }

    private static async Task<IResult> ApproveApplicationAsync(
        Guid applicationId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var application = await db.AthleteApplications.FirstOrDefaultAsync(
            x => x.Id == applicationId && x.SchoolId == schoolId.Value,
            cancellationToken);

        if (application is null)
        {
            return Results.NotFound();
        }

        if (application.Status != AthleteApplicationStatus.Pending)
        {
            return Results.Conflict();
        }

        var userExists = await db.Users.AnyAsync(
            x => x.SchoolId == schoolId.Value && x.NormalizedEmail == application.NormalizedAthleteEmail,
            cancellationToken);

        if (userExists)
        {
            return Results.Conflict();
        }

        // 1. Check if a parent user with this email already exists in this school
        var parentUser = await db.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(
                x => x.SchoolId == schoolId.Value && x.NormalizedEmail == application.NormalizedParentEmail,
                cancellationToken);

        if (parentUser is null)
        {
            // Create a new Parent AppUser
            parentUser = new AppUser
            {
                SchoolId = schoolId.Value,
                Email = application.ParentEmail,
                NormalizedEmail = application.NormalizedParentEmail,
                FullName = application.ParentFullName,
                PasswordHash = application.PasswordHash
            };
            parentUser.Roles.Add(new UserRoleAssignment { User = parentUser, Role = UserRole.Parent });
            db.Users.Add(parentUser);
        }
        else if (!parentUser.Roles.Any(r => r.Role == UserRole.Parent))
        {
            // If the user exists but doesn't have Parent role, assign it
            parentUser.Roles.Add(new UserRoleAssignment { User = parentUser, Role = UserRole.Parent });
        }

        // 2. Create the Athlete AppUser
        var athlete = new AppUser
        {
            SchoolId = schoolId.Value,
            Email = application.AthleteEmail,
            NormalizedEmail = application.NormalizedAthleteEmail,
            FullName = $"{application.AthleteFirstName} {application.AthleteLastName}",
            PasswordHash = application.PasswordHash
        };

        athlete.Roles.Add(new UserRoleAssignment { User = athlete, Role = UserRole.Athlete });

        // 3. Create the AthleteProfile, linking it to both the Athlete user and the Parent user
        var profile = new AthleteProfile
        {
            SchoolId = schoolId.Value,
            User = athlete,
            Parent = parentUser,
            FirstName = application.AthleteFirstName,
            LastName = application.AthleteLastName,
            BirthDate = application.AthleteBirthDate,
            ParentFullName = application.ParentFullName,
            ParentPhone = application.ParentPhone
        };

        application.Status = AthleteApplicationStatus.Approved;
        application.DecidedAt = DateTimeOffset.UtcNow;
        application.ApprovedUser = athlete;

        db.Users.Add(athlete);
        db.AthleteProfiles.Add(profile);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AthleteApplicationDecisionResponse.From(application, athlete.Id));
    }

    private static async Task<IResult> RejectApplicationAsync(
        Guid applicationId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var application = await db.AthleteApplications.FirstOrDefaultAsync(
            x => x.Id == applicationId && x.SchoolId == schoolId.Value,
            cancellationToken);

        if (application is null)
        {
            return Results.NotFound();
        }

        if (application.Status != AthleteApplicationStatus.Pending)
        {
            return Results.Conflict();
        }

        application.Status = AthleteApplicationStatus.Rejected;
        application.DecidedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(AthleteApplicationDecisionResponse.From(application, approvedUserId: null));
    }
}

public sealed record CreateAthleteApplicationRequest(
    string SchoolCode,
    string AthleteFirstName,
    string AthleteLastName,
    DateOnly AthleteBirthDate,
    string AthleteEmail,
    string Password,
    string ParentFullName,
    string ParentPhone,
    string ParentEmail);

public sealed record AthleteApplicationResponse(
    Guid Id,
    Guid SchoolId,
    string AthleteFirstName,
    string AthleteLastName,
    DateOnly AthleteBirthDate,
    string AthleteEmail,
    string ParentFullName,
    string ParentPhone,
    string ParentEmail,
    AthleteApplicationStatus Status)
{
    public static AthleteApplicationResponse From(AthleteApplication application)
    {
        return new AthleteApplicationResponse(
            application.Id,
            application.SchoolId,
            application.AthleteFirstName,
            application.AthleteLastName,
            application.AthleteBirthDate,
            application.AthleteEmail,
            application.ParentFullName,
            application.ParentPhone,
            application.ParentEmail,
            application.Status);
    }
}

public sealed record AthleteApplicationDecisionResponse(Guid Id, AthleteApplicationStatus Status, Guid? ApprovedUserId)
{
    public static AthleteApplicationDecisionResponse From(AthleteApplication application, Guid? approvedUserId)
    {
        return new AthleteApplicationDecisionResponse(application.Id, application.Status, approvedUserId);
    }
}
