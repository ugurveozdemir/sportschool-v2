using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Mobile;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class MobileCoachEndpointTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public MobileCoachEndpointTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CoachSummary_ReturnsOnlyCurrentCoachTrainings()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        var summary = await client.GetFromJsonAsync<MobileCoachSummaryResponse>("/api/mobile/coach/summary");

        Assert.NotNull(summary);
        var training = Assert.Single(summary!.TodayTrainings);
        Assert.Equal(data.CoachTraining.Id, training.Id);
        Assert.Equal("Bring cones", training.Notes);
        Assert.Equal(data.Group.Id, Assert.Single(training.Groups).Id);
        Assert.Equal(1, summary.WeekTrainingCount);
        Assert.Equal(1, summary.MissingAttendanceCount);
        Assert.Equal(1, summary.GroupCount);
        Assert.Equal(1, summary.AthleteCount);
    }

    [Fact]
    public async Task CoachSummary_JsonIncludesTrainingNotes()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        var json = await client.GetStringAsync("/api/mobile/coach/summary");
        using var document = JsonDocument.Parse(json);
        var training = document.RootElement.GetProperty("todayTrainings")[0];

        Assert.Equal(data.CoachTraining.Id, training.GetProperty("id").GetGuid());
        Assert.Equal("Bring cones", training.GetProperty("notes").GetString());
    }

    [Fact]
    public async Task AttendanceRoster_ReturnsNotFoundForAnotherCoachTraining()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var response = await client.GetAsync($"/api/mobile/coach/trainings/{data.OtherCoachTraining.Id}/attendance-roster");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AttendanceRoster_ForMultiGroupTraining_ReturnsDistinctAthletesFromAllGroups()
    {
        var data = await SeedCoachScenarioAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var extraGroup = new TrainingGroup
        {
            SchoolId = data.Group.SchoolId,
            Name = $"U16 {suffix}"
        };
        var extraAthleteUser = TestUsers.Create(data.Group.SchoolId, $"extra-athlete-{suffix}@example.com", "Extra Athlete", "password", UserRole.Athlete);
        var extraAthlete = new AthleteProfile
        {
            SchoolId = data.Group.SchoolId,
            User = extraAthleteUser,
            FirstName = "Extra",
            LastName = "Athlete",
            BirthDate = new DateOnly(2014, 1, 1),
            ParentFullName = "Extra Parent",
            ParentPhone = "05000000002"
        };

        await _factory.SeedAsync(db =>
        {
            db.Users.Add(extraAthleteUser);
            db.TrainingGroups.Add(extraGroup);
            db.AthleteProfiles.Add(extraAthlete);
            db.GroupAthletes.Add(new GroupAthlete { Group = extraGroup, AthleteProfileId = data.Athlete.Id });
            db.GroupAthletes.Add(new GroupAthlete { Group = extraGroup, AthleteProfile = extraAthlete });
            db.TrainingSessionGroups.Add(new TrainingSessionGroup
            {
                TrainingSessionId = data.CoachTraining.Id,
                Group = extraGroup
            });
            return Task.CompletedTask;
        });

        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        var roster = await client.GetFromJsonAsync<MobileCoachAttendanceRosterResponse>(
            $"/api/mobile/coach/trainings/{data.CoachTraining.Id}/attendance-roster");

        Assert.NotNull(roster);
        Assert.Equal(new[] { data.Group.Id, extraGroup.Id }.Order(), roster!.Training.Groups.Select(x => x.Id).Order());
        Assert.Equal(new[] { data.Athlete.Id, extraAthlete.Id }.Order(), roster.Athletes.Select(x => x.AthleteProfileId).Order());
    }

    [Fact]
    public async Task SaveAttendance_CreatesRecordForOwnTraining()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var response = await client.PostAsJsonAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/attendance", new
        {
            athleteProfileId = data.Athlete.Id,
            status = AttendanceStatus.Present
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var saved = await _factory.QueryAsync(db => db.AttendanceRecords.SingleAsync(
            x => x.TrainingSessionId == data.CoachTraining.Id && x.AthleteProfileId == data.Athlete.Id));
        Assert.Equal(AttendanceStatus.Present, saved.Status);
        Assert.Equal(data.Coach.Id, saved.RecordedByUserId);
    }

    [Fact]
    public async Task CoachAthletes_ReturnsOnlyCurrentCoachGroupAthletes()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        var athletes = await client.GetFromJsonAsync<MobileCoachAthleteListItem[]>("/api/mobile/coach/athletes");

        Assert.NotNull(athletes);
        var athlete = Assert.Single(athletes!);
        Assert.Equal(data.Athlete.Id, athlete.AthleteProfileId);
        Assert.Equal("Mobile", athlete.FirstName);
    }

    [Fact]
    public async Task CoachCanCreateReportForOwnAthlete()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var response = await client.PostAsJsonAsync($"/api/mobile/coach/athletes/{data.Athlete.Id}/reports", new
        {
            athleteProfileId = data.Athlete.Id,
            summary = "Tempo iyi, karar verme daha hızlı.",
            improvementAreas = "İlk kontrol ve topsuz koşu.",
            speedScore = 8.5m,
            strengthScore = 7.5m,
            dribblingScore = 8m,
            shootingScore = 7m
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var saved = await _factory.QueryAsync(db => db.AthleteReports.SingleAsync(x => x.AthleteProfileId == data.Athlete.Id));
        Assert.Equal(data.Coach.Id, saved.CoachId);
        Assert.Equal(8.5m, saved.SpeedScore);
    }

    [Fact]
    public async Task CoachCannotCreateReportForAnotherCoachAthlete()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var response = await client.PostAsJsonAsync($"/api/mobile/coach/athletes/{data.OtherCoachAthlete.Id}/reports", new
        {
            athleteProfileId = data.OtherCoachAthlete.Id,
            summary = "Geçersiz erişim.",
            improvementAreas = "Geçersiz erişim.",
            speedScore = 8m,
            strengthScore = 8m,
            dribblingScore = 8m,
            shootingScore = 8m
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<CoachScenario> SeedCoachScenarioAsync()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var school = new School
        {
            Name = $"Coach Mobile {suffix}",
            Code = $"coach-{suffix}",
            NormalizedCode = TextNormalizer.NormalizeSchoolCode($"coach-{suffix}")
        };
        var coach = TestUsers.Create(school.Id, $"coach-{suffix}@example.com", "Mobile Coach", "password", UserRole.Coach);
        var otherCoach = TestUsers.Create(school.Id, $"other-coach-{suffix}@example.com", "Other Coach", "password", UserRole.Coach);
        var athleteUser = TestUsers.Create(school.Id, $"athlete-{suffix}@example.com", "Mobile Athlete", "password", UserRole.Athlete);
        var otherCoachAthleteUser = TestUsers.Create(school.Id, $"other-athlete-{suffix}@example.com", "Other Athlete", "password", UserRole.Athlete);
        var group = new TrainingGroup
        {
            SchoolId = school.Id,
            Name = $"U12 {suffix}"
        };
        var otherGroup = new TrainingGroup
        {
            SchoolId = school.Id,
            Name = $"U14 {suffix}"
        };
        var athlete = new AthleteProfile
        {
            SchoolId = school.Id,
            User = athleteUser,
            FirstName = "Mobile",
            LastName = "Athlete",
            BirthDate = new DateOnly(2014, 1, 1),
            ParentFullName = "Mobile Parent",
            ParentPhone = "05000000000"
        };
        var otherCoachAthlete = new AthleteProfile
        {
            SchoolId = school.Id,
            User = otherCoachAthleteUser,
            FirstName = "Other",
            LastName = "Athlete",
            BirthDate = new DateOnly(2013, 1, 1),
            ParentFullName = "Other Parent",
            ParentPhone = "05000000001"
        };
        var now = DateTimeOffset.UtcNow;
        var todayStartsAt = new DateTimeOffset(now.Year, now.Month, now.Day, 12, 0, 0, TimeSpan.Zero);
        var coachTraining = new TrainingSession
        {
            SchoolId = school.Id,
            Coach = coach,
            Title = "Coach Training",
            StartsAt = todayStartsAt,
            EndsAt = todayStartsAt.AddHours(1),
            Notes = "Bring cones",
            Recurrence = TrainingRecurrence.None,
            Groups = { new TrainingSessionGroup { Group = group } }
        };
        var otherCoachTraining = new TrainingSession
        {
            SchoolId = school.Id,
            Coach = otherCoach,
            Title = "Other Coach Training",
            StartsAt = todayStartsAt,
            EndsAt = todayStartsAt.AddHours(1),
            Recurrence = TrainingRecurrence.None,
            Groups = { new TrainingSessionGroup { Group = otherGroup } }
        };

        await _factory.SeedAsync(db =>
        {
            db.Schools.Add(school);
            db.Users.AddRange(coach, otherCoach, athleteUser, otherCoachAthleteUser);
            db.TrainingGroups.AddRange(group, otherGroup);
            db.AthleteProfiles.AddRange(athlete, otherCoachAthlete);
            db.GroupAthletes.Add(new GroupAthlete { Group = group, AthleteProfile = athlete });
            db.GroupAthletes.Add(new GroupAthlete { Group = otherGroup, AthleteProfile = otherCoachAthlete });
            db.TrainingSessions.AddRange(coachTraining, otherCoachTraining);
            return Task.CompletedTask;
        });

        return new CoachScenario(coach, coachTraining, otherCoachTraining, group, athlete, otherCoachAthlete);
    }

    private sealed record CoachScenario(
        AppUser Coach,
        TrainingSession CoachTraining,
        TrainingSession OtherCoachTraining,
        TrainingGroup Group,
        AthleteProfile Athlete,
        AthleteProfile OtherCoachAthlete);
}
