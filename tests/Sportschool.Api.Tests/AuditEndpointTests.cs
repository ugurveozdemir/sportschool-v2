using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Features.Audit;
using Sportschool.Api.Features.Platform;
using Sportschool.Api.Features.SchoolManagement;
using Sportschool.Api.Features.Schools;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;
using Sportschool.Api.Tests.Infrastructure;

namespace Sportschool.Api.Tests;

public sealed class AuditEndpointTests
{
    [Fact]
    public async Task AuthenticatedMutation_PersistsRequestMetadataWithoutBody()
    {
        await using var factory = new TestAppFactory();
        var owner = TestUsers.Create(null, "audit-owner@example.com", "Audit Owner", "password", UserRole.PlatformOwner);
        await factory.SeedAsync(db =>
        {
            db.Users.Add(owner);
            return Task.CompletedTask;
        });
        using var client = factory.CreateAuthenticatedClient(owner, UserRole.PlatformOwner);

        using var response = await client.PostAsJsonAsync(
            "/api/platform/schools",
            new CreateSchoolRequest("Audit School", "audit-school"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var correlationId = Assert.Single(response.Headers.GetValues("X-Correlation-ID"));
        var auditLog = await factory.QueryAsync(db => db.AuditLogs.SingleAsync());
        Assert.Equal(owner.Id, auditLog.UserId);
        Assert.Null(auditLog.SchoolId);
        Assert.Equal("POST", auditLog.Method);
        Assert.Equal("/api/platform/schools", auditLog.Path);
        Assert.Equal(StatusCodes.Status201Created, auditLog.StatusCode);
        Assert.Equal(correlationId, auditLog.CorrelationId);
    }

    [Fact]
    public async Task SchoolAdmin_ListsOnlyOwnSchoolAuditLogs()
    {
        await using var factory = new TestAppFactory();
        var schoolAId = Guid.NewGuid();
        var schoolBId = Guid.NewGuid();
        var admin = TestUsers.Create(schoolAId, "audit-admin@example.com", "Audit Admin", "password", UserRole.SchoolAdmin);
        await factory.SeedAsync(db =>
        {
            db.Schools.AddRange(
                CreateSchool(schoolAId, "Audit A", "audit-a"),
                CreateSchool(schoolBId, "Audit B", "audit-b"));
            db.Users.Add(admin);
            db.AuditLogs.AddRange(
                CreateAuditLog(schoolAId, admin.Id, "/api/school/groups"),
                CreateAuditLog(schoolBId, Guid.NewGuid(), "/api/school/payments"));
            return Task.CompletedTask;
        });
        using var client = factory.CreateAuthenticatedClient(admin, UserRole.SchoolAdmin);

        var result = await client.GetFromJsonAsync<PaginatedList<AuditLogResponse>>("/api/school/audit-logs");

        Assert.NotNull(result);
        var item = Assert.Single(result.Items);
        Assert.Equal(schoolAId, item.SchoolId);
        Assert.Equal("/api/school/groups", item.Path);
    }

    private static School CreateSchool(Guid id, string name, string code) => new()
    {
        Id = id,
        Name = name,
        Code = code,
        NormalizedCode = TextNormalizer.NormalizeSchoolCode(code)
    };

    private static AuditLog CreateAuditLog(Guid schoolId, Guid userId, string path) => new()
    {
        SchoolId = schoolId,
        UserId = userId,
        Method = "POST",
        Path = path,
        StatusCode = StatusCodes.Status200OK,
        CorrelationId = Guid.NewGuid().ToString("N")
    };
}
