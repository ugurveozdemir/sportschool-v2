using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Media;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.SchoolManagement;

public static class SchoolManagementEndpoints
{
    public static RouteGroupBuilder MapSchoolManagementEndpoints(this IEndpointRouteBuilder app)
    {
        var adminGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString()));

        adminGroup.MapGet("/users", ListUsersAsync);
        adminGroup.MapGet("/coaches", ListCoachesAsync);
        adminGroup.MapGet("/coaches/{coachId:guid}", GetCoachAsync);
        adminGroup.MapPost("/coaches", UpsertCoachAsync);
        adminGroup.MapPost("/athletes", CreateAthleteAsync);
        adminGroup.MapGet("/athletes/{athleteProfileId:guid}", GetAthleteAsync);
        adminGroup.MapDelete("/coaches/{coachId:guid}", DeactivateCoachAsync);

        var staffGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        staffGroup.MapGet("/athletes", ListAthletesAsync);
        adminGroup.MapDelete("/athletes/{athleteProfileId:guid}", DeactivateAthleteAsync);

        return adminGroup;
    }

    private static async Task<IResult> ListUsersAsync(
        string? search,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (!RequestValidation.HasOptionalText(search, maximumLength: 160))
        {
            return Results.BadRequest();
        }

        var query = db.Users
            .AsNoTracking()
            .Include(x => x.Roles)
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(x =>
                x.FullName.ToLower().Contains(normalizedSearch) ||
                x.Email.ToLower().Contains(normalizedSearch));
        }

        var users = await query
            .OrderBy(x => x.FullName)
            .Take(RequestValidation.MaxUnpagedItems)
            .ToListAsync(cancellationToken);

        return Results.Ok(users.Select(SchoolUserResponse.From));
    }

    private static async Task<IResult> ListCoachesAsync(
        string? search,
        int? page,
        int? pageSize,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (!RequestValidation.HasValidPagination(page, pageSize)
            || !RequestValidation.HasOptionalText(search, maximumLength: 160))
        {
            return Results.BadRequest();
        }

        var query = db.Users
            .AsNoTracking()
            .Include(x => x.Roles)
            .Where(x => x.SchoolId == schoolId.Value
                && x.IsActive
                && x.Roles.Any(role => role.Role == UserRole.Coach));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(x =>
                x.FullName.ToLower().Contains(normalizedSearch) ||
                x.Email.ToLower().Contains(normalizedSearch));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var orderedQuery = query
            .OrderBy(x => x.FullName)
            .ThenBy(x => x.Email);

        if (page.HasValue && pageSize.HasValue)
        {
            var coaches = await orderedQuery
                .Skip((page.Value - 1) * pageSize.Value)
                .Take(pageSize.Value)
                .ToListAsync(cancellationToken);
            var items = await CreateCoachRosterResponsesAsync(coaches);

            return Results.Ok(new PaginatedList<CoachRosterResponse>(items, totalCount, page.Value, pageSize.Value));
        }

        var allCoaches = await orderedQuery
            .Take(RequestValidation.MaxUnpagedItems)
            .ToListAsync(cancellationToken);
        return Results.Ok(await CreateCoachRosterResponsesAsync(allCoaches));

        async Task<List<CoachRosterResponse>> CreateCoachRosterResponsesAsync(List<AppUser> coaches)
        {
            if (coaches.Count == 0)
            {
                return [];
            }

            var coachIds = coaches.Select(x => x.Id).ToArray();
            var now = DateTimeOffset.UtcNow;
            var usesSqlite = db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";
            var trainingQuery = db.TrainingSessions
                .AsNoTracking()
                .Where(x => x.SchoolId == schoolId.Value
                    && x.IsActive
                    && x.CompletedAt == null
                    && coachIds.Contains(x.CoachId));
            if (!usesSqlite)
            {
                trainingQuery = trainingQuery.Where(x => x.StartsAt >= now);
            }

            var trainingCandidates = await trainingQuery
                .Select(x => new { x.Id, x.CoachId, x.Title, x.StartsAt })
                .ToListAsync(cancellationToken);
            var upcomingTrainingRows = trainingCandidates
                .Where(x => x.StartsAt >= now)
                .OrderBy(x => x.StartsAt)
                .ToList();
            var nextTrainingByCoachId = upcomingTrainingRows
                .GroupBy(x => x.CoachId)
                .ToDictionary(x => x.Key, x => x.First());
            var upcomingTrainingCountByCoachId = upcomingTrainingRows
                .GroupBy(x => x.CoachId)
                .ToDictionary(x => x.Key, x => x.Count());
            var nextTrainingIds = nextTrainingByCoachId.Values.Select(x => x.Id).ToArray();
            var groupsByTrainingId = await db.TrainingSessionGroups
                .AsNoTracking()
                .Where(x => nextTrainingIds.Contains(x.TrainingSessionId)
                    && x.Group.SchoolId == schoolId.Value
                    && x.Group.IsActive)
                .OrderBy(x => x.Group.Name)
                .Select(x => new
                {
                    x.TrainingSessionId,
                    Group = new AthleteGroupResponse(x.Group.Id, x.Group.Name)
                })
                .ToListAsync(cancellationToken);
            var groupsByNextTrainingId = groupsByTrainingId
                .GroupBy(x => x.TrainingSessionId)
                .ToDictionary(x => x.Key, x => (IReadOnlyCollection<AthleteGroupResponse>)x.Select(row => row.Group).ToArray());

            return coaches.Select(coach =>
            {
                var nextTraining = nextTrainingByCoachId.GetValueOrDefault(coach.Id);
                return new CoachRosterResponse(
                    coach.Id,
                    coach.SchoolId!.Value,
                    coach.Email,
                    coach.FullName,
                    coach.Roles.Select(x => x.Role).Order().ToArray(),
                    nextTraining is null
                        ? null
                        : new CoachUpcomingTrainingResponse(
                            nextTraining.Id,
                            nextTraining.Title,
                            nextTraining.StartsAt,
                            groupsByNextTrainingId.GetValueOrDefault(nextTraining.Id, [])),
                    upcomingTrainingCountByCoachId.GetValueOrDefault(coach.Id));
            }).ToList();
        }
    }

    private static async Task<IResult> GetCoachAsync(
        Guid coachId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var coach = await db.Users
            .AsNoTracking()
            .Include(x => x.Roles)
            .FirstOrDefaultAsync(x => x.Id == coachId
                && x.SchoolId == schoolId.Value
                && x.IsActive
                && x.Roles.Any(role => role.Role == UserRole.Coach), cancellationToken);
        if (coach is null)
        {
            return Results.NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        var usesSqlite = db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";
        var trainingQuery = db.TrainingSessions
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value && x.CoachId == coachId);

        CoachTrainingRow? nextTrainingRow;
        List<CoachTrainingRow> historyTrainingRows;
        int startedTrainingCount;
        int completedTrainingCount;
        int upcomingTrainingCount;
        int inProgressTrainingCount;

        if (usesSqlite)
        {
            var trainingRows = await trainingQuery
                .Select(x => new CoachTrainingRow(
                    x.Id,
                    x.Title,
                    x.StartsAt,
                    x.EndsAt,
                    x.StartedAt,
                    x.StartedByUserId,
                    x.CompletedAt,
                    x.CompletedByUserId,
                    x.IsActive))
                .ToListAsync(cancellationToken);
            var activeTrainingRows = trainingRows.Where(x => x.IsActive).ToList();
            nextTrainingRow = activeTrainingRows
                .Where(x => x.StartedAt is null && x.CompletedAt is null && x.StartsAt >= now)
                .OrderBy(x => x.StartsAt)
                .FirstOrDefault();
            historyTrainingRows = trainingRows
                .Where(x => x.StartedAt is not null || x.CompletedAt is not null)
                .OrderByDescending(x => x.CompletedAt ?? x.StartedAt ?? x.StartsAt)
                .Take(8)
                .ToList();
            startedTrainingCount = trainingRows.Count(x => x.StartedByUserId == coachId);
            completedTrainingCount = trainingRows.Count(x => x.CompletedByUserId == coachId);
            upcomingTrainingCount = activeTrainingRows.Count(x => x.StartedAt is null && x.CompletedAt is null && x.StartsAt >= now);
            inProgressTrainingCount = activeTrainingRows.Count(x => x.StartedAt is not null && x.CompletedAt is null);
        }
        else
        {
            var activeTrainingQuery = trainingQuery.Where(x => x.IsActive);
            nextTrainingRow = await activeTrainingQuery
                .Where(x => x.StartedAt == null && x.CompletedAt == null && x.StartsAt >= now)
                .OrderBy(x => x.StartsAt)
                .Select(x => new CoachTrainingRow(
                    x.Id,
                    x.Title,
                    x.StartsAt,
                    x.EndsAt,
                    x.StartedAt,
                    x.StartedByUserId,
                    x.CompletedAt,
                    x.CompletedByUserId,
                    x.IsActive))
                .FirstOrDefaultAsync(cancellationToken);
            historyTrainingRows = await trainingQuery
                .Where(x => x.StartedAt != null || x.CompletedAt != null)
                .OrderByDescending(x => x.CompletedAt ?? x.StartedAt ?? x.StartsAt)
                .Take(8)
                .Select(x => new CoachTrainingRow(
                    x.Id,
                    x.Title,
                    x.StartsAt,
                    x.EndsAt,
                    x.StartedAt,
                    x.StartedByUserId,
                    x.CompletedAt,
                    x.CompletedByUserId,
                    x.IsActive))
                .ToListAsync(cancellationToken);

            startedTrainingCount = await trainingQuery.CountAsync(x => x.StartedByUserId == coachId, cancellationToken);
            completedTrainingCount = await trainingQuery.CountAsync(x => x.CompletedByUserId == coachId, cancellationToken);
            upcomingTrainingCount = await activeTrainingQuery.CountAsync(
                x => x.StartedAt == null && x.CompletedAt == null && x.StartsAt >= now,
                cancellationToken);
            inProgressTrainingCount = await activeTrainingQuery.CountAsync(
                x => x.StartedAt != null && x.CompletedAt == null,
                cancellationToken);
        }

        var displayedTrainingIds = historyTrainingRows
            .Select(x => x.Id)
            .Append(nextTrainingRow?.Id ?? Guid.Empty)
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToArray();
        var groupRows = await db.TrainingSessionGroups
            .AsNoTracking()
            .Where(x => displayedTrainingIds.Contains(x.TrainingSessionId)
                && x.Group.SchoolId == schoolId.Value
                && x.Group.IsActive)
            .OrderBy(x => x.Group.Name)
            .Select(x => new
            {
                x.TrainingSessionId,
                Group = new AthleteGroupResponse(x.Group.Id, x.Group.Name)
            })
            .ToListAsync(cancellationToken);
        var groupsByTrainingId = groupRows
            .GroupBy(x => x.TrainingSessionId)
            .ToDictionary(x => x.Key, x => (IReadOnlyCollection<AthleteGroupResponse>)x.Select(row => row.Group).ToArray());
        var coachGroups = await db.TrainingSessionGroups
            .AsNoTracking()
            .Where(x => x.TrainingSession.SchoolId == schoolId.Value
                && x.TrainingSession.CoachId == coachId
                && x.Group.SchoolId == schoolId.Value
                && x.Group.IsActive)
            .Select(x => new { x.Group.Id, x.Group.Name })
            .Distinct()
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
        var groups = coachGroups
            .Select(x => new AthleteGroupResponse(x.Id, x.Name))
            .ToArray();
        var reportCount = await db.TrainingAthleteReports
            .CountAsync(x => x.SchoolId == schoolId.Value && x.CoachId == coachId, cancellationToken);

        var stats = new CoachProfileStatsResponse(
            startedTrainingCount,
            completedTrainingCount,
            upcomingTrainingCount,
            inProgressTrainingCount,
            reportCount);
        var nextTraining = nextTrainingRow is null
            ? null
            : new CoachUpcomingTrainingResponse(
                nextTrainingRow.Id,
                nextTrainingRow.Title,
                nextTrainingRow.StartsAt,
                groupsByTrainingId.GetValueOrDefault(nextTrainingRow.Id, []));
        var recentTrainings = historyTrainingRows
            .Select(training => new CoachTrainingHistoryResponse(
                training.Id,
                training.Title,
                training.StartsAt,
                training.EndsAt,
                training.StartedAt,
                training.CompletedAt,
                training.CompletedAt is not null
                    ? "Completed"
                    : training.StartedAt is not null
                        ? "InProgress"
                        : "Scheduled",
                groupsByTrainingId.GetValueOrDefault(training.Id, [])))
            .ToArray();

        return Results.Ok(new CoachDetailResponse(
            coach.Id,
            schoolId.Value,
            coach.Email,
            coach.FullName,
            coach.Roles.Select(x => x.Role).Order().ToArray(),
            coach.CreatedAt,
            stats,
            nextTraining,
            groups,
            recentTrainings));
    }

    private static async Task<IResult> ListAthletesAsync(
        string? search,
        Guid? groupId,
        int? page,
        int? pageSize,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (!RequestValidation.HasValidPagination(page, pageSize)
            || !RequestValidation.HasOptionalText(search, maximumLength: 160))
        {
            return Results.BadRequest();
        }

        var query = db.AthleteProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive && x.User.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(x =>
                x.FirstName.ToLower().Contains(normalizedSearch) ||
                x.LastName.ToLower().Contains(normalizedSearch) ||
                x.ParentFullName.ToLower().Contains(normalizedSearch));
        }

        if (groupId.HasValue)
        {
            query = query.Where(x => db.GroupAthletes.Any(
                membership => membership.GroupId == groupId.Value
                    && membership.AthleteProfileId == x.Id
                    && membership.Group.SchoolId == schoolId.Value
                    && membership.Group.IsActive));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var orderedQuery = query
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName);

        if (page.HasValue && pageSize.HasValue)
        {
            var athletes = await orderedQuery
                .Skip((page.Value - 1) * pageSize.Value)
                .Take(pageSize.Value)
                .ToListAsync(cancellationToken);
            var items = await CreateRosterResponsesAsync(athletes);

            return Results.Ok(new PaginatedList<AthleteRosterResponse>(items, totalCount, page.Value, pageSize.Value));
        }
        else
        {
            var athletes = await orderedQuery
                .Take(RequestValidation.MaxUnpagedItems)
                .ToListAsync(cancellationToken);
            var items = await CreateRosterResponsesAsync(athletes);

            return Results.Ok(items);
        }

        async Task<List<AthleteRosterResponse>> CreateRosterResponsesAsync(List<AthleteProfile> athletes)
        {
            if (athletes.Count == 0)
            {
                return [];
            }

            var athleteIds = athletes.Select(x => x.Id).ToArray();
            var groupRows = await db.GroupAthletes
                .AsNoTracking()
                .Where(x => athleteIds.Contains(x.AthleteProfileId)
                    && x.Group.SchoolId == schoolId.Value
                    && x.Group.IsActive)
                .OrderBy(x => x.Group.Name)
                .Select(x => new
                {
                    x.AthleteProfileId,
                    Group = new AthleteGroupResponse(x.Group.Id, x.Group.Name)
                })
                .ToListAsync(cancellationToken);
            var groupsByAthleteId = groupRows
                .GroupBy(x => x.AthleteProfileId)
                .ToDictionary(x => x.Key, x => (IReadOnlyCollection<AthleteGroupResponse>)x.Select(row => row.Group).ToArray());

            return athletes
                .Select(x => AthleteRosterResponse.From(
                    x,
                    groupsByAthleteId.GetValueOrDefault(x.Id, []),
                    mediaUrls))
                .ToList();
        }
    }

    private static async Task<IResult> UpsertCoachAsync(
        CreateCoachRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        TemporaryPasswordGenerator passwordGenerator,
        CancellationToken cancellationToken)
    {
        if (!RequestValidation.HasValidEmail(request.Email)
            || !RequestValidation.HasRequiredText(request.FullName, maximumLength: 160))
        {
            return Results.BadRequest();
        }

        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var schoolIsActive = await db.Schools.AnyAsync(
            x => x.Id == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!schoolIsActive)
        {
            return Results.Forbid();
        }

        var normalizedEmail = TextNormalizer.NormalizeEmail(request.Email);
        var existingUser = await db.Users
            .Include(x => x.Roles)
            .FirstOrDefaultAsync(
                x => x.SchoolId == schoolId.Value && x.NormalizedEmail == normalizedEmail,
                cancellationToken);

        if (existingUser is not null)
        {
            if (!existingUser.IsActive)
            {
                var isCoachOnly = existingUser.Roles.Count == 1
                    && existingUser.Roles[0].Role == UserRole.Coach;
                if (!isCoachOnly)
                {
                    return Results.Conflict();
                }

                existingUser.IsActive = true;
                existingUser.FullName = request.FullName.Trim();
                await db.SaveChangesAsync(cancellationToken);

                return Results.Ok(CoachResponse.From(existingUser, temporaryPassword: null, isReactivated: true));
            }

            if (existingUser.Roles.Any(x => x.Role == UserRole.Coach))
            {
                return Results.Conflict();
            }

            existingUser.Roles.Add(new UserRoleAssignment
            {
                UserId = existingUser.Id,
                Role = UserRole.Coach
            });
            await db.SaveChangesAsync(cancellationToken);

            return Results.Ok(CoachResponse.From(existingUser, temporaryPassword: null));
        }

        var temporaryPassword = passwordGenerator.Create();
        var coach = new AppUser
        {
            SchoolId = schoolId.Value,
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = passwordHasher.Hash(temporaryPassword)
        };

        coach.Roles.Add(new UserRoleAssignment
        {
            User = coach,
            Role = UserRole.Coach
        });

        db.Users.Add(coach);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/school/coaches/{coach.Id}", CoachResponse.From(coach, temporaryPassword));
    }

    private static async Task<IResult> GetAthleteAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var athlete = await db.AthleteProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Parent)
            .FirstOrDefaultAsync(
                x => x.Id == athleteProfileId
                    && x.SchoolId == schoolId.Value
                    && x.IsActive
                    && x.User.IsActive,
                cancellationToken);

        if (athlete is null)
        {
            return Results.NotFound();
        }

        var groups = await db.GroupAthletes
            .AsNoTracking()
            .Where(x =>
                x.AthleteProfileId == athlete.Id
                && x.Group.SchoolId == schoolId.Value
                && x.Group.IsActive)
            .OrderBy(x => x.Group.Name)
            .Select(x => new AthleteGroupResponse(x.Group.Id, x.Group.Name))
            .ToListAsync(cancellationToken);

        return Results.Ok(AthleteDetailResponse.From(athlete, groups, mediaUrls));
    }

    private static async Task<IResult> CreateAthleteAsync(
        CreateAthleteRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        PasswordHasher passwordHasher,
        MediaAccessUrlService mediaUrls,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (!RequestValidation.HasRequiredText(request.FirstName, maximumLength: 80)
            || !RequestValidation.HasRequiredText(request.LastName, maximumLength: 80)
            || !RequestValidation.HasRequiredText($"{request.FirstName.Trim()} {request.LastName.Trim()}", maximumLength: 160)
            || !RequestValidation.HasValidEmail(request.AthleteEmail)
            || !RequestValidation.HasValidPassword(request.AthletePassword)
            || !RequestValidation.HasRequiredText(request.ParentFullName, maximumLength: 160)
            || !RequestValidation.HasRequiredText(request.ParentPhone, maximumLength: 40)
            || !RequestValidation.HasValidEmail(request.ParentEmail)
            || !RequestValidation.HasValidBirthDate(request.BirthDate)
            || !Enum.IsDefined(request.PreferredFoot))
        {
            return Results.BadRequest();
        }

        var schoolIsActive = await db.Schools.AnyAsync(
            x => x.Id == schoolId.Value && x.IsActive,
            cancellationToken);
        if (!schoolIsActive)
        {
            return Results.Forbid();
        }

        var normalizedAthleteEmail = TextNormalizer.NormalizeEmail(request.AthleteEmail);
        var normalizedParentEmail = TextNormalizer.NormalizeEmail(request.ParentEmail);
        if (normalizedAthleteEmail == normalizedParentEmail)
        {
            return Results.BadRequest();
        }

        var athleteEmailExists = await db.Users.AnyAsync(
            x => x.SchoolId == schoolId.Value && x.NormalizedEmail == normalizedAthleteEmail,
            cancellationToken);
        if (athleteEmailExists)
        {
            return Results.Conflict();
        }

        TrainingGroup? group = null;
        if (request.GroupId is not null)
        {
            group = await db.TrainingGroups.FirstOrDefaultAsync(
                x => x.Id == request.GroupId.Value && x.SchoolId == schoolId.Value && x.IsActive,
                cancellationToken);
            if (group is null)
            {
                return Results.NotFound();
            }
        }

        var parent = await db.Users
            .Include(x => x.Roles)
            .FirstOrDefaultAsync(
                x => x.SchoolId == schoolId.Value && x.NormalizedEmail == normalizedParentEmail,
                cancellationToken);

        if (parent is { IsActive: false })
        {
            return Results.Conflict();
        }

        if (parent is null)
        {
            if (!RequestValidation.HasValidPassword(request.ParentPassword))
            {
                return Results.BadRequest();
            }

            parent = new AppUser
            {
                SchoolId = schoolId.Value,
                Email = request.ParentEmail.Trim(),
                NormalizedEmail = normalizedParentEmail,
                FullName = request.ParentFullName.Trim(),
                PasswordHash = passwordHasher.Hash(request.ParentPassword!)
            };
            parent.Roles.Add(new UserRoleAssignment { User = parent, Role = UserRole.Parent });
            db.Users.Add(parent);
        }
        else if (!parent.Roles.Any(x => x.Role == UserRole.Parent))
        {
            parent.Roles.Add(new UserRoleAssignment { User = parent, Role = UserRole.Parent });
        }

        var athleteUser = new AppUser
        {
            SchoolId = schoolId.Value,
            Email = request.AthleteEmail.Trim(),
            NormalizedEmail = normalizedAthleteEmail,
            FullName = $"{request.FirstName.Trim()} {request.LastName.Trim()}",
            PasswordHash = passwordHasher.Hash(request.AthletePassword)
        };
        athleteUser.Roles.Add(new UserRoleAssignment { User = athleteUser, Role = UserRole.Athlete });

        var athleteProfile = new AthleteProfile
        {
            SchoolId = schoolId.Value,
            User = athleteUser,
            Parent = parent,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            BirthDate = request.BirthDate,
            PreferredFoot = request.PreferredFoot,
            ParentFullName = request.ParentFullName.Trim(),
            ParentPhone = request.ParentPhone.Trim()
        };

        db.Users.Add(athleteUser);
        db.AthleteProfiles.Add(athleteProfile);
        if (group is not null)
        {
            db.GroupAthletes.Add(new GroupAthlete { Group = group, AthleteProfile = athleteProfile });
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/school/athletes/{athleteProfile.Id}",
            AthleteRosterResponse.From(
                athleteProfile,
                group is null ? [] : [new AthleteGroupResponse(group.Id, group.Name)],
                mediaUrls));
    }

    private static async Task<IResult> DeactivateCoachAsync(
        Guid coachId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var currentUserId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || currentUserId is null)
        {
            return Results.Forbid();
        }

        if (coachId == currentUserId.Value)
        {
            return Results.BadRequest();
        }

        var user = await db.Users
            .Include(x => x.Roles)
            .Include(x => x.RefreshTokens)
            .FirstOrDefaultAsync(
                x => x.Id == coachId
                    && x.SchoolId == schoolId.Value
                    && x.IsActive
                    && x.Roles.Any(role => role.Role == UserRole.Coach)
                    && x.Roles.All(role => role.Role == UserRole.Coach),
                cancellationToken);

        if (user is null)
        {
            return Results.NotFound();
        }

        user.IsActive = false;
        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var token in user.RefreshTokens.Where(t => t.IsActive))
        {
            token.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeactivateAthleteAsync(
        Guid athleteProfileId,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var profile = await db.AthleteProfiles
            .Include(x => x.User)
            .ThenInclude(u => u.RefreshTokens)
            .FirstOrDefaultAsync(x => x.Id == athleteProfileId && x.SchoolId == schoolId.Value && x.IsActive, cancellationToken);

        if (profile is null)
        {
            return Results.NotFound();
        }

        profile.IsActive = false;
        profile.User.IsActive = false;

        var revokedAt = DateTimeOffset.UtcNow;
        foreach (var token in profile.User.RefreshTokens.Where(t => t.IsActive))
        {
            token.RevokedAt = revokedAt;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private sealed record CoachTrainingRow(
        Guid Id,
        string Title,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        DateTimeOffset? StartedAt,
        Guid? StartedByUserId,
        DateTimeOffset? CompletedAt,
        Guid? CompletedByUserId,
        bool IsActive);
}

public sealed record CreateCoachRequest(string Email, string FullName);

public sealed record CreateAthleteRequest(
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    string AthleteEmail,
    string AthletePassword,
    string ParentFullName,
    string ParentPhone,
    string ParentEmail,
    string? ParentPassword,
    Guid? GroupId,
    PreferredFoot PreferredFoot = PreferredFoot.Unknown);

public sealed record SchoolUserResponse(Guid Id, Guid SchoolId, string Email, string FullName, UserRole[] Roles)
{
    public static SchoolUserResponse From(AppUser user)
    {
        return new SchoolUserResponse(
            user.Id,
            user.SchoolId!.Value,
            user.Email,
            user.FullName,
            user.Roles.Select(x => x.Role).Order().ToArray());
    }
}

public sealed record AthleteRosterResponse(
    Guid Id,
    Guid SchoolId,
    Guid UserId,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    PreferredFoot PreferredFoot,
    string ParentFullName,
    string ParentPhone,
    string? ProfileImageUrl,
    IReadOnlyCollection<AthleteGroupResponse> Groups)
{
    public static AthleteRosterResponse From(
        AthleteProfile athlete,
        IReadOnlyCollection<AthleteGroupResponse> groups,
        MediaAccessUrlService mediaUrls)
    {
        return new AthleteRosterResponse(
            athlete.Id,
            athlete.SchoolId,
            athlete.UserId,
            athlete.FirstName,
            athlete.LastName,
            athlete.BirthDate,
            athlete.PreferredFoot,
            athlete.ParentFullName,
            athlete.ParentPhone,
            athlete.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(athlete.SchoolId, athlete.Id, athlete.ProfileImageVersion),
            groups);
    }
}

public sealed record AthleteGroupResponse(Guid Id, string Name);

public sealed record AthleteDetailResponse(
    Guid Id,
    Guid SchoolId,
    Guid UserId,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    PreferredFoot PreferredFoot,
    string Email,
    string ParentFullName,
    string ParentPhone,
    string? ParentEmail,
    decimal? MonthlyFeeOverride,
    string? ProfileImageUrl,
    DateTimeOffset CreatedAt,
    IReadOnlyCollection<AthleteGroupResponse> Groups)
{
    public static AthleteDetailResponse From(
        AthleteProfile athlete,
        IReadOnlyCollection<AthleteGroupResponse> groups,
        MediaAccessUrlService mediaUrls)
    {
        return new AthleteDetailResponse(
            athlete.Id,
            athlete.SchoolId,
            athlete.UserId,
            athlete.FirstName,
            athlete.LastName,
            athlete.BirthDate,
            athlete.PreferredFoot,
            athlete.User.Email,
            athlete.ParentFullName,
            athlete.ParentPhone,
            athlete.Parent?.Email,
            athlete.MonthlyFeeOverride,
            athlete.ProfileImageStorageKey is null ? null : mediaUrls.CreateProfileImageUrl(athlete.SchoolId, athlete.Id, athlete.ProfileImageVersion),
            athlete.CreatedAt,
            groups);
    }
}

public sealed record CoachResponse(Guid Id, Guid SchoolId, string Email, string FullName, string? TemporaryPassword, bool IsReactivated)
{
    public static CoachResponse From(AppUser user, string? temporaryPassword, bool isReactivated = false)
    {
        return new CoachResponse(user.Id, user.SchoolId!.Value, user.Email, user.FullName, temporaryPassword, isReactivated);
    }
}

public sealed record CoachRosterResponse(
    Guid Id,
    Guid SchoolId,
    string Email,
    string FullName,
    UserRole[] Roles,
    CoachUpcomingTrainingResponse? NextTraining,
    int UpcomingTrainingCount);

public sealed record CoachUpcomingTrainingResponse(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    IReadOnlyCollection<AthleteGroupResponse> Groups);

public sealed record CoachDetailResponse(
    Guid Id,
    Guid SchoolId,
    string Email,
    string FullName,
    UserRole[] Roles,
    DateTimeOffset CreatedAt,
    CoachProfileStatsResponse Stats,
    CoachUpcomingTrainingResponse? NextTraining,
    IReadOnlyCollection<AthleteGroupResponse> Groups,
    IReadOnlyCollection<CoachTrainingHistoryResponse> RecentTrainings);

public sealed record CoachProfileStatsResponse(
    int StartedTrainingCount,
    int CompletedTrainingCount,
    int UpcomingTrainingCount,
    int InProgressTrainingCount,
    int ReportCount);

public sealed record CoachTrainingHistoryResponse(
    Guid Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    string Status,
    IReadOnlyCollection<AthleteGroupResponse> Groups);

public sealed record PaginatedList<T>(IReadOnlyCollection<T> Items, int TotalCount, int Page, int PageSize);
