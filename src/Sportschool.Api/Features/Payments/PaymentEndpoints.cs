using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Payments;

public static class PaymentEndpoints
{
    public static RouteGroupBuilder MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var schoolGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        schoolGroup.MapGet("/athletes/{athleteProfileId:guid}/payments", ListPaymentsAsync);
        schoolGroup.MapPut("/athletes/{athleteProfileId:guid}/payments/{year:int}/{month:int}", UpsertPaymentAsync);

        return schoolGroup;
    }

    private static async Task<IResult> ListPaymentsAsync(
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

        var athleteExists = await db.AthleteProfiles.AnyAsync(
            x => x.Id == athleteProfileId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!athleteExists)
        {
            return Results.NotFound();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var payments = await db.StudentPayments
            .Where(x => x.SchoolId == schoolId.Value && x.AthleteProfileId == athleteProfileId)
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .Select(x => PaymentResponse.From(x, today))
            .ToListAsync(cancellationToken);

        return Results.Ok(payments);
    }

    private static async Task<IResult> UpsertPaymentAsync(
        Guid athleteProfileId,
        int year,
        int month,
        SavePaymentRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        var userId = CurrentUser.GetUserId(currentUser);
        if (schoolId is null || userId is null)
        {
            return Results.Forbid();
        }

        if (request.Amount <= 0 || !Enum.IsDefined(request.Status) || month is < 1 or > 12 || year < 2000)
        {
            return Results.BadRequest();
        }

        var athleteExists = await db.AthleteProfiles.AnyAsync(
            x => x.Id == athleteProfileId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (!athleteExists)
        {
            return Results.NotFound();
        }

        var payment = await db.StudentPayments.FirstOrDefaultAsync(
            x => x.SchoolId == schoolId.Value
                && x.AthleteProfileId == athleteProfileId
                && x.Year == year
                && x.Month == month,
            cancellationToken);

        if (payment is null)
        {
            payment = new StudentPayment
            {
                SchoolId = schoolId.Value,
                AthleteProfileId = athleteProfileId,
                Year = year,
                Month = month
            };
            db.StudentPayments.Add(payment);
        }

        payment.Amount = request.Amount;
        payment.Status = request.Status;
        payment.PaidOn = request.Status == PaymentStatus.Paid ? request.PaidOn ?? DateOnly.FromDateTime(DateTime.UtcNow) : null;
        payment.UpdatedByUserId = userId.Value;
        payment.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(PaymentResponse.From(payment, DateOnly.FromDateTime(DateTime.UtcNow)));
    }
}

public sealed record SavePaymentRequest(decimal Amount, PaymentStatus Status, DateOnly? PaidOn);

public sealed record PaymentResponse(
    Guid Id,
    Guid AthleteProfileId,
    int Year,
    int Month,
    decimal Amount,
    PaymentStatus Status,
    PaymentStatus EffectiveStatus,
    DateOnly? PaidOn)
{
    public static PaymentResponse From(StudentPayment payment, DateOnly today)
    {
        return new PaymentResponse(
            payment.Id,
            payment.AthleteProfileId,
            payment.Year,
            payment.Month,
            payment.Amount,
            payment.Status,
            PaymentStatusCalculator.GetEffectiveStatus(payment, today),
            payment.PaidOn);
    }
}
