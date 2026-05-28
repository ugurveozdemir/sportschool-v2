using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Attendance;
using Sportschool.Api.Features.Dashboard;
using Sportschool.Api.Features.Groups;
using Sportschool.Api.Features.Payments;
using Sportschool.Api.Features.Reports;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Trainings;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class DashboardProductEndpointTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task CoachCanReadDashboardSummary()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedProductFixtureAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);
        var from = new DateTimeOffset(2026, 5, 24, 0, 0, 0, TimeSpan.Zero);
        var to = from.AddDays(7);

        using var response = await client.GetAsync($"/api/school/dashboard/summary?from={Uri.EscapeDataString(from.ToString("O"))}&to={Uri.EscapeDataString(to.ToString("O"))}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<DashboardSummaryResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(1, body.WeekTrainingCount);
        Assert.Equal(1, body.ActiveAthleteCount);
        Assert.Equal(1, body.ActiveGroupCount);
        Assert.Equal(1, body.UnpaidPaymentCount);
        Assert.Single(body.RecentReports);
    }

    [Fact]
    public async Task StaffTrainingListAndAttendanceRosterStayInsideTenant()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedProductFixtureAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);
        var from = new DateTimeOffset(2026, 5, 24, 0, 0, 0, TimeSpan.Zero);
        var to = from.AddDays(7);

        var trainings = await client.GetFromJsonAsync<TrainingListResponse[]>(
            $"/api/school/trainings?from={Uri.EscapeDataString(from.ToString("O"))}&to={Uri.EscapeDataString(to.ToString("O"))}",
            JsonOptions);
        Assert.NotNull(trainings);
        var training = Assert.Single(trainings);
        Assert.Equal(fixture.TrainingId, training.Id);
        Assert.Equal("Group A", Assert.Single(training.Groups).Name);
        Assert.Equal(1, training.AttendanceSummary.TotalAthletes);

        var roster = await client.GetFromJsonAsync<AttendanceRosterResponse>(
            $"/api/school/trainings/{fixture.TrainingId}/attendance-roster",
            JsonOptions);
        Assert.NotNull(roster);
        var athlete = Assert.Single(roster.Athletes);
        Assert.Equal(fixture.AthleteId, athlete.AthleteProfileId);
        Assert.Equal(AttendanceStatus.Present, athlete.Status);
    }

    [Fact]
    public async Task CoachCanUpdateExistingAttendance()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedProductFixtureAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);
        var request = new SaveAttendanceRequest(fixture.AthleteId, AttendanceStatus.Absent);

        using var response = await client.PutAsJsonAsync(
            $"/api/school/trainings/{fixture.TrainingId}/attendance/{fixture.AthleteId}",
            request,
            JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var status = await factory.QueryAsync(db => db.AttendanceRecords
            .Where(x => x.TrainingSessionId == fixture.TrainingId && x.AthleteProfileId == fixture.AthleteId)
            .Select(x => x.Status)
            .SingleAsync());
        Assert.Equal(AttendanceStatus.Absent, status);
    }

    [Fact]
    public async Task MonthlyPaymentsIncludeAthletesWithoutPaymentRows()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedProductFixtureAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Coach, UserRole.Coach);

        var payments = await client.GetFromJsonAsync<MonthlyPaymentResponse[]>("/api/school/payments?year=2026&month=5", JsonOptions);

        Assert.NotNull(payments);
        var payment = Assert.Single(payments);
        Assert.Equal(fixture.AthleteId, payment.AthleteProfileId);
        Assert.Null(payment.PaymentId);
        Assert.Equal(PaymentStatus.Unpaid, payment.EffectiveStatus);
    }

    [Fact]
    public async Task ParentCannotReadStaffProductEndpoints()
    {
        await using var factory = new TestAppFactory();
        var fixture = await SeedProductFixtureAsync(factory);
        using var client = factory.CreateAuthenticatedClient(fixture.Parent, UserRole.Parent);

        using var summaryResponse = await client.GetAsync("/api/school/dashboard/summary");
        using var paymentsResponse = await client.GetAsync("/api/school/payments?year=2026&month=5");

        Assert.Equal(HttpStatusCode.Forbidden, summaryResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, paymentsResponse.StatusCode);
    }

    private static async Task<ProductFixture> SeedProductFixtureAsync(TestAppFactory factory)
    {
        var schoolId = Guid.NewGuid();
        var otherSchoolId = Guid.NewGuid();
        var groupId = Guid.NewGuid();
        var otherGroupId = Guid.NewGuid();
        var trainingId = Guid.NewGuid();
        var otherTrainingId = Guid.NewGuid();
        var athleteId = Guid.NewGuid();
        var coach = TestUsers.Create(schoolId, "coach-dashboard@example.com", "Coach A", "password", UserRole.Coach);
        var parent = TestUsers.Create(schoolId, "parent-dashboard@example.com", "Parent A", "password", UserRole.Parent, UserRole.Athlete);
        var otherCoach = TestUsers.Create(otherSchoolId, "coach-other@example.com", "Coach B", "password", UserRole.Coach);
        var otherParent = TestUsers.Create(otherSchoolId, "parent-other@example.com", "Parent B", "password", UserRole.Parent, UserRole.Athlete);

        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(
                CreateSchool(schoolId, "School A", "dash-a"),
                CreateSchool(otherSchoolId, "School B", "dash-b"));
            db.Users.AddRange(coach, parent, otherCoach, otherParent);
            db.TrainingGroups.AddRange(
                new TrainingGroup { Id = groupId, SchoolId = schoolId, Name = "Group A" },
                new TrainingGroup { Id = otherGroupId, SchoolId = otherSchoolId, Name = "Group B" });
            db.AthleteProfiles.AddRange(
                new()
                {
                    Id = athleteId,
                    SchoolId = schoolId,
                    User = parent,
                    FirstName = "Athlete",
                    LastName = "A",
                    BirthDate = new DateOnly(2014, 1, 1),
                    ParentFullName = "Parent A",
                    ParentPhone = "555"
                },
                new()
                {
                    SchoolId = otherSchoolId,
                    User = otherParent,
                    FirstName = "Athlete",
                    LastName = "B",
                    BirthDate = new DateOnly(2014, 1, 1),
                    ParentFullName = "Parent B",
                    ParentPhone = "555"
                });
            db.GroupAthletes.Add(new GroupAthlete { GroupId = groupId, AthleteProfileId = athleteId });
            db.TrainingSessions.AddRange(
                new TrainingSession
                {
                    Id = trainingId,
                    SchoolId = schoolId,
                    CoachId = coach.Id,
                    Title = "Training A",
                    StartsAt = new DateTimeOffset(2026, 5, 24, 10, 0, 0, TimeSpan.Zero),
                    EndsAt = new DateTimeOffset(2026, 5, 24, 11, 0, 0, TimeSpan.Zero),
                    Groups = { new TrainingSessionGroup { GroupId = groupId } }
                },
                new TrainingSession
                {
                    Id = otherTrainingId,
                    SchoolId = otherSchoolId,
                    CoachId = otherCoach.Id,
                    Title = "Training B",
                    StartsAt = new DateTimeOffset(2026, 5, 24, 10, 0, 0, TimeSpan.Zero),
                    EndsAt = new DateTimeOffset(2026, 5, 24, 11, 0, 0, TimeSpan.Zero),
                    Groups = { new TrainingSessionGroup { GroupId = otherGroupId } }
                });
            db.AttendanceRecords.Add(new AttendanceRecord
            {
                SchoolId = schoolId,
                TrainingSessionId = trainingId,
                AthleteProfileId = athleteId,
                Status = AttendanceStatus.Present,
                RecordedByUserId = coach.Id
            });
            db.AthleteReports.Add(new AthleteReport
            {
                SchoolId = schoolId,
                AthleteProfileId = athleteId,
                CoachId = coach.Id,
                Summary = "Good progress",
                ImprovementAreas = "Keep working",
                SpeedScore = 7,
                StrengthScore = 7,
                DribblingScore = 7,
                ShootingScore = 7
            });
            return Task.CompletedTask;
        });

        return new ProductFixture(coach, parent, trainingId, athleteId);
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

    private sealed record ProductFixture(AppUser Coach, AppUser Parent, Guid TrainingId, Guid AthleteId);
}
