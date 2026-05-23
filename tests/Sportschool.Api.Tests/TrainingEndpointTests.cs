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
            GroupId: groupId,
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

        // Verify database has exactly 1 session
        var dbSessions = await factory.QueryAsync(db => db.TrainingSessions.Where(x => x.SchoolId == schoolId).ToListAsync());
        var singleSession = Assert.Single(dbSessions);
        Assert.Equal(body.Id, singleSession.Id);
        Assert.Equal("Gym A", singleSession.Location);
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
            GroupId: groupId,
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

        Assert.All(orderedSessions, s =>
        {
            Assert.Equal(groupId, s.GroupId);
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
            GroupId: groupId,
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
            GroupId: groupId,
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
