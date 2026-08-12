using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class TrainingEndpointTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task CreateSingleTrainingSession_WorksCorrectly()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-training@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-1"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.Add(coach);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        var request = new CreateTrainingRequest(
            GroupIds: [groupId],
            Title: "Basketball Fundamentals",
            StartsAt: DateTimeOffset.UtcNow.AddDays(1),
            EndsAt: DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Recurrence: TrainingRecurrence.None,
            RecurrenceEndsOn: null,
            Location: "Gym A",
            Notes: "Bring sneakers");

        using var response = await client.PostAsJsonAsync("/api/school/trainings", request, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<TrainingResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(request.Title, body.Title);
        Assert.Equal(TrainingRecurrence.None, body.Recurrence);
        Assert.Equal([groupId], body.Groups.Select(x => x.Id));

        // Verify database has exactly 1 session
        var dbSessions = await factory.QueryAsync(db => db.TrainingSessions.Where(x => x.SchoolId == schoolId).ToListAsync());
        var singleSession = Assert.Single(dbSessions);
        Assert.Equal(body.Id, singleSession.Id);
        Assert.Equal("Gym A", singleSession.Location);
        var savedGroup = await factory.QueryAsync(db => db.TrainingSessionGroups.SingleAsync(x => x.TrainingSessionId == singleSession.Id));
        Assert.Equal(groupId, savedGroup.GroupId);
    }

    [Fact]
    public async Task CreateTrainingSession_WithMultipleGroups_CreatesGroupLinks()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupAId = Guid.NewGuid();
        var groupBId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-training-multi@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-multi"));
            db.TrainingGroups.AddRange(
                new TrainingGroup { Id = groupAId, SchoolId = schoolId, Name = "Group A" },
                new TrainingGroup { Id = groupBId, SchoolId = schoolId, Name = "Group B" });
            db.Users.Add(coach);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        var request = new CreateTrainingRequest(
            GroupIds: [groupAId, groupBId],
            Title: "Combined Practice",
            StartsAt: DateTimeOffset.UtcNow.AddDays(1),
            EndsAt: DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Recurrence: TrainingRecurrence.None,
            RecurrenceEndsOn: null,
            Location: "Main Field",
            Notes: null);

        using var response = await client.PostAsJsonAsync("/api/school/trainings", request, JsonOptions);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<TrainingResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(new[] { groupAId, groupBId }.Order(), body!.Groups.Select(x => x.Id).Order());

        var savedGroupIds = await factory.QueryAsync(db => db.TrainingSessionGroups
            .Where(x => x.TrainingSessionId == body.Id)
            .Select(x => x.GroupId)
            .Order()
            .ToArrayAsync());
        Assert.Equal(new[] { groupAId, groupBId }.Order(), savedGroupIds);
    }

    [Fact]
    public async Task SchoolAdminCanAssignTrainingToActiveCoach()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var admin = TestUsers.Create(
            schoolId,
            "admin-assign-training@example.com",
            "Admin",
            "password",
            UserRole.SchoolAdmin,
            UserRole.Coach);
        var coach = TestUsers.Create(schoolId, "coach-assigned-training@example.com", "Coach", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-assign"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.AddRange(admin, coach);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        var request = new CreateTrainingRequest(
            [groupId],
            "Coach Assignment",
            DateTimeOffset.UtcNow.AddDays(1),
            DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            TrainingRecurrence.None,
            null,
            null,
            null,
            coach.Id);

        using var response = await client.PostAsJsonAsync("/api/school/trainings", request, JsonOptions);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var savedSession = await factory.QueryAsync(db => db.TrainingSessions.SingleAsync());
        Assert.Equal(coach.Id, savedSession.CoachId);
    }

    [Fact]
    public async Task SchoolAdminWithCoachRoleCanUpdateAndDeactivateAnotherCoachTraining()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var trainingId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolId, "admin-manage-training@example.com", "Admin", "password", UserRole.SchoolAdmin, UserRole.Coach);
        var coach = TestUsers.Create(schoolId, "coach-managed-training@example.com", "Coach", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-manage"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.AddRange(admin, coach);
            db.TrainingSessions.Add(new TrainingSession
            {
                Id = trainingId,
                SchoolId = schoolId,
                CoachId = coach.Id,
                Title = "Original Training",
                StartsAt = DateTimeOffset.UtcNow.AddDays(1),
                EndsAt = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                Groups = { new TrainingSessionGroup { GroupId = groupId } }
            });
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);
        var update = new UpdateTrainingRequest(
            [groupId],
            "Updated Training",
            DateTimeOffset.UtcNow.AddDays(2),
            DateTimeOffset.UtcNow.AddDays(2).AddHours(1),
            null,
            null,
            coach.Id);

        using var updateResponse = await client.PutAsJsonAsync($"/api/school/trainings/{trainingId}", update, JsonOptions);
        using var deleteResponse = await client.DeleteAsync($"/api/school/trainings/{trainingId}");

        Assert.Equal(HttpStatusCode.NoContent, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        var training = await factory.QueryAsync(db => db.TrainingSessions.SingleAsync(x => x.Id == trainingId));
        Assert.Equal("Updated Training", training.Title);
        Assert.False(training.IsActive);
    }

    [Fact]
    public async Task CreateWeeklyRecurringTraining_ExpandsCorrectly()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-rec@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-2"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.Add(coach);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        var startDate = new DateTimeOffset(2026, 6, 1, 10, 0, 0, TimeSpan.Zero); // Monday
        var endDate = startDate.AddHours(1);
        var recurrenceEnd = new DateOnly(2026, 6, 15); // Monday two weeks later (3 sessions: June 1, June 8, June 15)

        var request = new CreateTrainingRequest(
            GroupIds: [groupId],
            Title: "Weekly Team Practice",
            StartsAt: startDate,
            EndsAt: endDate,
            Recurrence: TrainingRecurrence.Weekly,
            RecurrenceEndsOn: recurrenceEnd,
            Location: "Court B",
            Notes: null);

        using var response = await client.PostAsJsonAsync("/api/school/trainings", request, JsonOptions);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<TrainingResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(request.Title, body.Title);
        Assert.Equal(TrainingRecurrence.Weekly, body.Recurrence);

        // Verify database has expanded 3 sessions
        var dbSessions = await factory.QueryAsync(db => db.TrainingSessions.Where(x => x.SchoolId == schoolId).ToListAsync());
        var orderedSessions = dbSessions.OrderBy(x => x.StartsAt).ToList();
        Assert.Equal(3, orderedSessions.Count);

        Assert.Equal(startDate, orderedSessions[0].StartsAt);
        Assert.Equal(startDate.AddDays(7), orderedSessions[1].StartsAt);
        Assert.Equal(startDate.AddDays(14), orderedSessions[2].StartsAt);

        var sessionGroups = await factory.QueryAsync(db => db.TrainingSessionGroups
            .Where(x => orderedSessions.Select(session => session.Id).Contains(x.TrainingSessionId))
            .ToListAsync());

        Assert.All(orderedSessions, s =>
        {
            Assert.Contains(sessionGroups, group => group.TrainingSessionId == s.Id && group.GroupId == groupId);
            Assert.Equal("Court B", s.Location);
            Assert.Equal(TrainingRecurrence.Weekly, s.Recurrence);
            Assert.Equal(recurrenceEnd, s.RecurrenceEndsOn);
        });
    }

    [Fact]
    public async Task CreateWeeklyRecurringTraining_WithoutEndDate_ReturnsBadRequest()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-bad-rec@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-3"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.Add(coach);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        var request = new CreateTrainingRequest(
            GroupIds: [groupId],
            Title: "Weekly Team Practice",
            StartsAt: DateTimeOffset.UtcNow,
            EndsAt: DateTimeOffset.UtcNow.AddHours(1),
            Recurrence: TrainingRecurrence.Weekly,
            RecurrenceEndsOn: null,
            Location: null,
            Notes: null);

        using var response = await client.PostAsJsonAsync("/api/school/trainings", request, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateWeeklyRecurringTraining_ExceedingOneYear_ReturnsBadRequest()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-exceed@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-4"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.Add(coach);
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        var request = new CreateTrainingRequest(
            GroupIds: [groupId],
            Title: "Weekly Team Practice",
            StartsAt: DateTimeOffset.UtcNow,
            EndsAt: DateTimeOffset.UtcNow.AddHours(1),
            Recurrence: TrainingRecurrence.Weekly,
            RecurrenceEndsOn: DateOnly.FromDateTime(DateTime.UtcNow).AddYears(1).AddDays(1), // Exceeds 1 year safety limit
            Location: null,
            Notes: null);

        using var response = await client.PostAsJsonAsync("/api/school/trainings", request, JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateTrainingSession_WorksCorrectly()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var trainingId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-upd@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-upd"));
            var group = new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" };
            db.TrainingGroups.Add(group);
            db.Users.Add(coach);
            db.TrainingSessions.Add(new TrainingSession
            {
                Id = trainingId,
                SchoolId = schoolId,
                CoachId = coach.Id,
                Title = "Old Title",
                StartsAt = DateTimeOffset.UtcNow.AddDays(1),
                EndsAt = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                Location = "Old Loc",
                Groups = { new TrainingSessionGroup { GroupId = groupId } }
            });
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        var request = new UpdateTrainingRequest(
            GroupIds: [groupId],
            Title: "New Title",
            StartsAt: DateTimeOffset.UtcNow.AddDays(2),
            EndsAt: DateTimeOffset.UtcNow.AddDays(2).AddHours(2),
            Location: "New Loc",
            Notes: "Updated notes");

        using var response = await client.PutAsJsonAsync($"/api/school/trainings/{trainingId}", request, JsonOptions);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var session = await factory.QueryAsync(db => db.TrainingSessions.SingleAsync(x => x.Id == trainingId));
        Assert.Equal("New Title", session.Title);
        Assert.Equal("New Loc", session.Location);
        Assert.Equal("Updated notes", session.Notes);
        Assert.Equal(request.StartsAt, session.StartsAt);
    }

    [Fact]
    public async Task DeactivateTrainingSession_WorksCorrectly()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var trainingId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-del@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-del"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.Add(coach);
            db.TrainingSessions.Add(new TrainingSession
            {
                Id = trainingId,
                SchoolId = schoolId,
                CoachId = coach.Id,
                Title = "Session to Delete",
                StartsAt = DateTimeOffset.UtcNow.AddDays(1),
                EndsAt = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                Groups = { new TrainingSessionGroup { GroupId = groupId } }
            });
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);

        using var response = await client.DeleteAsync($"/api/school/trainings/{trainingId}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var session = await factory.QueryAsync(db => db.TrainingSessions.SingleAsync(x => x.Id == trainingId));
        Assert.False(session.IsActive);
    }

    [Fact]
    public async Task ExpiredTrainingCannotBeUpdatedOrDeactivated()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var trainingId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-expired@example.com", "Coach A", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "Tenant School", "train-expired"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.Add(coach);
            db.TrainingSessions.Add(new TrainingSession
            {
                Id = trainingId,
                SchoolId = schoolId,
                CoachId = coach.Id,
                Title = "Expired Training",
                StartsAt = DateTimeOffset.UtcNow.AddHours(-2),
                EndsAt = DateTimeOffset.UtcNow.AddHours(-1),
                Groups = { new TrainingSessionGroup { GroupId = groupId } }
            });
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coach, UserRole.Coach);
        var update = new UpdateTrainingRequest(
            [groupId],
            "Updated Training",
            DateTimeOffset.UtcNow.AddDays(1),
            DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            null,
            null);

        using var updateResponse = await client.PutAsJsonAsync($"/api/school/trainings/{trainingId}", update, JsonOptions);
        using var deactivateResponse = await client.DeleteAsync($"/api/school/trainings/{trainingId}");

        Assert.Equal(HttpStatusCode.Conflict, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, deactivateResponse.StatusCode);
        var session = await factory.QueryAsync(db => db.TrainingSessions.SingleAsync(x => x.Id == trainingId));
        Assert.True(session.IsActive);
        Assert.Equal("Expired Training", session.Title);
    }

    [Fact]
    public async Task ModifyTrainingSession_TenantIsolation_Enforced()
    {
        await using var factory = new TestAppFactory();
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var groupAId = Guid.NewGuid();
        var trainingAId = Guid.NewGuid();
        var coachA = TestUsers.Create(schoolAId, "coach-iso-a@example.com", "Coach A", "password", UserRole.Coach);
        var coachB = TestUsers.Create(schoolBId, "coach-iso-b@example.com", "Coach B", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(CreateSchool(schoolAId, "School A", "iso-a"), CreateSchool(schoolBId, "School B", "iso-b"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupAId, SchoolId = schoolAId, Name = "Group A" });
            db.Users.AddRange(coachA, coachB);
            db.TrainingSessions.Add(new TrainingSession
            {
                Id = trainingAId,
                SchoolId = schoolAId,
                CoachId = coachA.Id,
                Title = "School A Session",
                StartsAt = DateTimeOffset.UtcNow.AddDays(1),
                EndsAt = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                Groups = { new TrainingSessionGroup { GroupId = groupAId } }
            });
            return Task.CompletedTask;
        });

        // Coach B (School B) tries to edit/delete School A's session
        using var client = factory.CreateAuthenticatedClient(coachB, UserRole.Coach);

        var editRequest = new UpdateTrainingRequest(
            GroupIds: [groupAId],
            Title: "Hacked",
            StartsAt: DateTimeOffset.UtcNow.AddDays(1),
            EndsAt: DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Location: null,
            Notes: null);

        using var editResponse = await client.PutAsJsonAsync($"/api/school/trainings/{trainingAId}", editRequest, JsonOptions);
        Assert.Equal(HttpStatusCode.NotFound, editResponse.StatusCode);

        using var deleteResponse = await client.DeleteAsync($"/api/school/trainings/{trainingAId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task CoachCannotModifyAnotherCoachTrainingInSameSchool()
    {
        await using var factory = new TestAppFactory();
        var schoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var trainingId = Guid.NewGuid();
        var coachA = TestUsers.Create(schoolId, "coach-owner@example.com", "Coach A", "password", UserRole.Coach);
        var coachB = TestUsers.Create(schoolId, "coach-other-same-school@example.com", "Coach B", "password", UserRole.Coach);

        await factory.SeedAsync(db =>
        {
            db.Schools.Add(CreateSchool(schoolId, "School A", "same-school"));
            db.TrainingGroups.Add(new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" });
            db.Users.AddRange(coachA, coachB);
            db.TrainingSessions.Add(new TrainingSession
            {
                Id = trainingId,
                SchoolId = schoolId,
                CoachId = coachA.Id,
                Title = "Coach A Session",
                StartsAt = DateTimeOffset.UtcNow.AddDays(1),
                EndsAt = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
                Groups = { new TrainingSessionGroup { GroupId = groupId } }
            });
            return Task.CompletedTask;
        });

        using var client = factory.CreateAuthenticatedClient(coachB, UserRole.Coach);
        var editRequest = new UpdateTrainingRequest(
            GroupIds: [groupId],
            Title: "Wrong Coach Update",
            StartsAt: DateTimeOffset.UtcNow.AddDays(1),
            EndsAt: DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Location: null,
            Notes: null);

        using var editResponse = await client.PutAsJsonAsync($"/api/school/trainings/{trainingId}", editRequest, JsonOptions);
        using var deleteResponse = await client.DeleteAsync($"/api/school/trainings/{trainingId}");

        Assert.Equal(HttpStatusCode.NotFound, editResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    private static School CreateSchool(Guid id, string name, string code)
    {
        return new School
        {
            Id = id,
            Name = name,
            Code = code,
            NormalizedCode = TextNormalizer.NormalizeSchoolCode(code)
        };
    }
}
