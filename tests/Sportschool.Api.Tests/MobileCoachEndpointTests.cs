using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Announcements;
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
    public async Task CoachSummary_ReturnsOwnTrainingsAndSchoolWideGroupCounts()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        var summary = await client.GetFromJsonAsync<MobileCoachSummaryResponse>("/api/mobile/coach/summary");

        Assert.NotNull(summary);
        // Today's trainings only shows trainings belonging to this coach
        var training = Assert.Single(summary!.TodayTrainings);
        Assert.Equal(data.CoachTraining.Id, training.Id);
        Assert.Equal("Bring cones", training.Notes);
        Assert.Equal(data.Group.Id, Assert.Single(training.Groups).Id);
        Assert.Equal(1, summary.WeekTrainingCount);
        Assert.Equal(1, summary.MissingAttendanceCount);
        // Groups and athletes are school-wide, not limited to this coach's trainings
        Assert.Equal(2, summary.GroupCount);
        Assert.Equal(2, summary.AthleteCount);
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
    public async Task CoachTrainings_WithoutDateRange_ReturnsNextOwnTraining()
    {
        var data = await SeedCoachScenarioAsync();
        var futureStartsAt = DateTimeOffset.UtcNow.AddDays(2);
        var futureTraining = new TrainingSession
        {
            SchoolId = data.Group.SchoolId,
            CoachId = data.Coach.Id,
            Title = "Next Coach Training",
            StartsAt = futureStartsAt,
            EndsAt = futureStartsAt.AddHours(1),
            Recurrence = TrainingRecurrence.None,
            Groups = { new TrainingSessionGroup { GroupId = data.Group.Id } }
        };
        await _factory.SeedAsync(db =>
        {
            db.TrainingSessions.Add(futureTraining);
            return Task.CompletedTask;
        });
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        var trainings = await client.GetFromJsonAsync<MobileCoachTrainingItem[]>("/api/mobile/coach/trainings");

        Assert.NotNull(trainings);
        Assert.Contains(trainings!, training => training.Id == futureTraining.Id);
        Assert.DoesNotContain(trainings, training => training.Id == data.OtherCoachTraining.Id);
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
        Assert.Contains(roster.Athletes, athlete => athlete.AthleteProfileId == data.Athlete.Id && athlete.ProfileImageUrl is not null);
    }

    [Fact]
    public async Task SaveAttendance_CreatesRecordForOwnTraining()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var startResponse = await client.PostAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);

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
    public async Task SaveAttendance_ForNotYetStartedTraining_IsRejected()
    {
        var data = await SeedCoachScenarioAsync();
        var futureStartsAt = DateTimeOffset.UtcNow.AddHours(2);
        var futureTraining = new TrainingSession
        {
            SchoolId = data.Group.SchoolId,
            CoachId = data.Coach.Id,
            Title = "Future Coach Training",
            StartsAt = futureStartsAt,
            EndsAt = futureStartsAt.AddHours(1),
            Recurrence = TrainingRecurrence.None,
            Groups = { new TrainingSessionGroup { GroupId = data.Group.Id } }
        };
        await _factory.SeedAsync(db =>
        {
            db.TrainingSessions.Add(futureTraining);
            return Task.CompletedTask;
        });

        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var response = await client.PostAsJsonAsync($"/api/mobile/coach/trainings/{futureTraining.Id}/attendance", new
        {
            athleteProfileId = data.Athlete.Id,
            status = AttendanceStatus.Present
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var count = await _factory.QueryAsync(db => db.AttendanceRecords.CountAsync(
            x => x.TrainingSessionId == futureTraining.Id));
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task StartTraining_CreatesPendingAttendanceAndOnlyRelatedAthleteSeesAnnouncement()
    {
        var data = await SeedCoachScenarioAsync();
        using var coachClient = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var startResponse = await coachClient.PostAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/start", null);

        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);
        var pending = await _factory.QueryAsync(db => db.AttendanceRecords
            .Where(x => x.TrainingSessionId == data.CoachTraining.Id)
            .ToListAsync());
        Assert.Single(pending);
        Assert.Null(pending[0].Status);
        Assert.Equal(data.Coach.Id, await _factory.QueryAsync(db => db.TrainingSessions
            .Where(x => x.Id == data.CoachTraining.Id)
            .Select(x => x.StartedByUserId)
            .SingleAsync()));

        using var athleteClient = _factory.CreateAuthenticatedClient(data.AthleteUser, UserRole.Athlete);
        using var otherAthleteClient = _factory.CreateAuthenticatedClient(data.OtherCoachAthleteUser, UserRole.Athlete);
        var announcements = await athleteClient.GetFromJsonAsync<AnnouncementResponse[]>("/api/me/announcements");
        var otherAnnouncements = await otherAthleteClient.GetFromJsonAsync<AnnouncementResponse[]>("/api/me/announcements");

        Assert.NotNull(announcements);
        Assert.Single(announcements!);
        Assert.Equal(data.CoachTraining.Id, announcements[0].TrainingSessionId);
        Assert.Empty(otherAnnouncements!);
    }

    [Fact]
    public async Task StartTraining_IsBlockedBeforeTwoHourWindow()
    {
        var data = await SeedCoachScenarioAsync();
        var futureStartsAt = DateTimeOffset.UtcNow.AddHours(3);
        var futureTraining = new TrainingSession
        {
            SchoolId = data.Group.SchoolId,
            CoachId = data.Coach.Id,
            Title = "Too Early Training",
            StartsAt = futureStartsAt,
            EndsAt = futureStartsAt.AddHours(1),
            Recurrence = TrainingRecurrence.None,
            Groups = { new TrainingSessionGroup { GroupId = data.Group.Id } }
        };
        await _factory.SeedAsync(db =>
        {
            db.TrainingSessions.Add(futureTraining);
            return Task.CompletedTask;
        });

        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);
        using var response = await client.PostAsync($"/api/mobile/coach/trainings/{futureTraining.Id}/start", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var lifecycle = await _factory.QueryAsync(db => db.TrainingSessions
            .Where(x => x.Id == futureTraining.Id)
            .Select(x => new { x.StartedAt })
            .SingleAsync());
        Assert.Null(lifecycle.StartedAt);
        Assert.Equal(0, await _factory.QueryAsync(db => db.AttendanceRecords.CountAsync(
            x => x.TrainingSessionId == futureTraining.Id)));
    }

    [Fact]
    public async Task CompleteTraining_RequiresAttendanceAndLocksAttendanceAfterCompletion()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var startResponse = await client.PostAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/start", null);
        Assert.Equal(HttpStatusCode.OK, startResponse.StatusCode);

        using var incompleteResponse = await client.PostAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/complete", null);
        Assert.Equal(HttpStatusCode.Conflict, incompleteResponse.StatusCode);

        using var attendanceResponse = await client.PutAsJsonAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/attendance", new
        {
            items = new[] { new { athleteProfileId = data.Athlete.Id, status = AttendanceStatus.Present } }
        });
        Assert.Equal(HttpStatusCode.NoContent, attendanceResponse.StatusCode);

        using var completeResponse = await client.PostAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/complete", null);
        Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

        var lifecycle = await _factory.QueryAsync(db => db.TrainingSessions
            .Where(x => x.Id == data.CoachTraining.Id)
            .Select(x => new { x.StartedByUserId, x.CompletedByUserId, x.StartedAt, x.CompletedAt })
            .SingleAsync());
        Assert.Equal(data.Coach.Id, lifecycle.StartedByUserId);
        Assert.Equal(data.Coach.Id, lifecycle.CompletedByUserId);
        Assert.NotNull(lifecycle.StartedAt);
        Assert.NotNull(lifecycle.CompletedAt);

        using var lockedResponse = await client.PutAsJsonAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/attendance/{data.Athlete.Id}", new
        {
            athleteProfileId = data.Athlete.Id,
            status = AttendanceStatus.Absent
        });
        Assert.Equal(HttpStatusCode.Conflict, lockedResponse.StatusCode);
    }

    [Fact]
    public async Task TrainingReport_IsSavedOnlyForPresentAthleteAndMemberCanReadAutomaticSummary()
    {
        var data = await SeedCoachScenarioAsync();
        using var coachClient = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        await coachClient.PostAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/start", null);
        await coachClient.PutAsJsonAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/attendance", new
        {
            items = new[] { new { athleteProfileId = data.Athlete.Id, status = AttendanceStatus.Present } }
        });
        await coachClient.PostAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/complete", null);

        using var reportResponse = await coachClient.PutAsJsonAsync($"/api/mobile/coach/trainings/{data.CoachTraining.Id}/athletes/{data.Athlete.Id}/report", new
        {
            athleteProfileId = data.Athlete.Id,
            nutritionScore = 80,
            cognitiveDevelopmentScore = 70,
            disciplineScore = 90,
            physicalConditionScore = 60,
            psychologicalDevelopmentScore = 75,
            tacticalDevelopmentScore = 65,
            technicalDevelopmentScore = 85,
            coachNote = "İyi odaklandı."
        });
        Assert.Equal(HttpStatusCode.OK, reportResponse.StatusCode);

        var athleteDetail = await coachClient.GetFromJsonAsync<MobileCoachAthleteDetailResponse>(
            $"/api/mobile/coach/athletes/{data.Athlete.Id}");
        Assert.NotNull(athleteDetail);
        var trainingReport = Assert.Single(athleteDetail!.TrainingReports);
        Assert.Equal(data.Coach.FullName, trainingReport.CoachName);
        Assert.Equal(data.CoachTraining.Title, trainingReport.TrainingTitle);

        var trainingReportList = await coachClient.GetFromJsonAsync<CoachTrainingReportListItem[]>(
            "/api/mobile/coach/training-reports");
        var trainingReportListItem = Assert.Single(trainingReportList!);
        Assert.Equal(data.CoachTraining.Id, trainingReportListItem.TrainingSessionId);
        Assert.Equal(data.Coach.FullName, trainingReportListItem.CoachName);

        var trainingReportDetail = await coachClient.GetFromJsonAsync<CoachTrainingReportDetailResponse>(
            $"/api/mobile/coach/training-reports/{data.CoachTraining.Id}");
        Assert.NotNull(trainingReportDetail);
        var athleteTrainingReport = Assert.Single(trainingReportDetail!.Reports);
        Assert.Equal(data.Athlete.Id, athleteTrainingReport.AthleteProfileId);
        Assert.Equal("Mobile Athlete", athleteTrainingReport.AthleteName);

        using var athleteClient = _factory.CreateAuthenticatedClient(data.AthleteUser, UserRole.Athlete);
        var summary = await athleteClient.GetFromJsonAsync<DevelopmentSummaryResponse>("/api/me/development-summary");
        Assert.NotNull(summary);
        Assert.Equal(1, summary!.ReportCount);
        Assert.Equal(90, summary.Averages!.Discipline);
        Assert.Equal(70, summary.Averages.CognitiveDevelopment);
        Assert.Equal(100, summary.AttendanceRate);
        Assert.Single(summary.Reports);
    }

    [Fact]
    public async Task CoachAthletes_ReturnsAllSchoolAthletes()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        var athletes = await client.GetFromJsonAsync<MobileCoachAthleteListItem[]>("/api/mobile/coach/athletes");

        Assert.NotNull(athletes);
        // All athletes in the school are visible, not just those in this coach's training groups
        Assert.Equal(2, athletes!.Length);
        Assert.Contains(athletes, a => a.AthleteProfileId == data.Athlete.Id);
        Assert.Contains(athletes, a => a.AthleteProfileId == data.OtherCoachAthlete.Id);
        Assert.Contains(athletes, a => a.AthleteProfileId == data.Athlete.Id && a.ProfileImageUrl is not null);
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
    public async Task CoachCanCreateReportForAnySchoolAthlete()
    {
        var data = await SeedCoachScenarioAsync();
        using var client = _factory.CreateAuthenticatedClient(data.Coach, UserRole.Coach);

        using var response = await client.PostAsJsonAsync($"/api/mobile/coach/athletes/{data.OtherCoachAthlete.Id}/reports", new
        {
            athleteProfileId = data.OtherCoachAthlete.Id,
            summary = "Teknik açıdan gelişme var.",
            improvementAreas = "Topsuz koşu ve ilk kontrol.",
            speedScore = 8m,
            strengthScore = 8m,
            dribblingScore = 8m,
            shootingScore = 8m
        });

        // Any coach in the school can create reports for any school athlete
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
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
            ParentPhone = "05000000000",
            ProfileImageStorageKey = "profile-images/mobile-athlete.png",
            ProfileImageVersion = Guid.NewGuid()
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
        var startOfDay = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        // A training that has already started earlier today, so its attendance window is open
        // regardless of the wall-clock time the test suite runs at.
        var todayStartsAt = now.AddHours(-1) < startOfDay ? startOfDay : now.AddHours(-1);
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

        return new CoachScenario(coach, coachTraining, otherCoachTraining, group, athlete, otherCoachAthlete, athleteUser, otherCoachAthleteUser);
    }

    private sealed record CoachScenario(
        AppUser Coach,
        TrainingSession CoachTraining,
        TrainingSession OtherCoachTraining,
        TrainingGroup Group,
        AthleteProfile Athlete,
        AthleteProfile OtherCoachAthlete,
        AppUser AthleteUser,
        AppUser OtherCoachAthleteUser);
}
