using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sportschool.Api.Common;
using Sportschool.Api.Data;
using Sportschool.Api.Features.Athletes;
using Sportschool.Api.Features.Users;
using Sportschool.Api.Security;

namespace Sportschool.Api.Features.Payments;

public static class PaymentEndpoints
{
    public static RouteGroupBuilder MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var schoolGroup = app.MapGroup("/api/school")
            .RequireAuthorization(policy => policy.RequireRole(UserRole.SchoolAdmin.ToString(), UserRole.Coach.ToString()));

        schoolGroup.MapGet("/payment-settings", GetPaymentSettingsAsync);
        schoolGroup.MapPut("/payment-settings", UpdatePaymentSettingsAsync);
        schoolGroup.MapGet("/payments", ListMonthlyPaymentsAsync);
        schoolGroup.MapGet("/athletes/{athleteProfileId:guid}/payments", ListPaymentsAsync);
        schoolGroup.MapPut("/athletes/{athleteProfileId:guid}/fee", UpdateAthleteFeeAsync);
        schoolGroup.MapPut("/athletes/{athleteProfileId:guid}/payments/{year:int}/{month:int}", UpsertPaymentAsync);

        return schoolGroup;
    }

    private static async Task<IResult> GetPaymentSettingsAsync(
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        var settings = await db.Schools
            .AsNoTracking()
            .Where(x => x.Id == schoolId.Value)
            .Select(x => new PaymentSettingsResponse(x.DefaultMonthlyFee, x.PaymentDayOfMonth))
            .FirstOrDefaultAsync(cancellationToken);

        return settings is null ? Results.NotFound() : Results.Ok(settings);
    }

    private static async Task<IResult> UpdatePaymentSettingsAsync(
        SavePaymentSettingsRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (request.DefaultMonthlyFee is < 0 || request.PaymentDayOfMonth is < 1 or > 28)
        {
            return Results.BadRequest();
        }

        var school = await db.Schools.FirstOrDefaultAsync(x => x.Id == schoolId.Value, cancellationToken);
        if (school is null)
        {
            return Results.NotFound();
        }

        school.DefaultMonthlyFee = request.DefaultMonthlyFee;
        school.PaymentDayOfMonth = request.PaymentDayOfMonth;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new PaymentSettingsResponse(school.DefaultMonthlyFee, school.PaymentDayOfMonth));
    }

    private static async Task<IResult> UpdateAthleteFeeAsync(
        Guid athleteProfileId,
        SaveAthleteFeeRequest request,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (request.MonthlyFee is < 0)
        {
            return Results.BadRequest();
        }

        var athlete = await db.AthleteProfiles.FirstOrDefaultAsync(
            x => x.Id == athleteProfileId && x.SchoolId == schoolId.Value && x.IsActive,
            cancellationToken);

        if (athlete is null)
        {
            return Results.NotFound();
        }

        athlete.MonthlyFeeOverride = request.MonthlyFee;
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new AthleteFeeResponse(athlete.Id, athlete.MonthlyFeeOverride));
    }

    private static async Task<IResult> ListMonthlyPaymentsAsync(
        int year,
        int month,
        ClaimsPrincipal currentUser,
        SportschoolDbContext db,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken)
    {
        var schoolId = CurrentUser.GetSchoolId(currentUser);
        if (schoolId is null)
        {
            return Results.Forbid();
        }

        if (month is < 1 or > 12 || year < 2000)
        {
            return Results.BadRequest();
        }

        var school = await db.Schools
            .AsNoTracking()
            .Where(x => x.Id == schoolId.Value)
            .Select(x => new { x.DefaultMonthlyFee, x.PaymentDayOfMonth })
            .FirstOrDefaultAsync(cancellationToken);

        if (school is null)
        {
            return Results.NotFound();
        }

        var today = DateOnly.FromDateTime(LocalDayRange.StartOfToday(timeZone).DateTime);
        var isActive = PaymentSchedule.IsMonthActive(year, month, school.PaymentDayOfMonth, today);

        var rows = await db.AthleteProfiles
            .AsNoTracking()
            .Where(x => x.SchoolId == schoolId.Value && x.IsActive && x.User.IsActive)
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .Select(x => new
            {
                Athlete = x,
                Payment = db.StudentPayments.FirstOrDefault(payment =>
                    payment.SchoolId == schoolId.Value
                    && payment.AthleteProfileId == x.Id
                    && payment.Year == year
                    && payment.Month == month)
            })
            .ToListAsync(cancellationToken);

        return Results.Ok(rows.Select(x => MonthlyPaymentResponse.From(
            x.Athlete,
            x.Payment,
            year,
            month,
            today,
            PaymentSchedule.EffectiveFee(school.DefaultMonthlyFee, x.Athlete.MonthlyFeeOverride),
            isActive)));
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

public sealed record PaymentSettingsResponse(decimal? DefaultMonthlyFee, int? PaymentDayOfMonth);

public sealed record SavePaymentSettingsRequest(decimal? DefaultMonthlyFee, int? PaymentDayOfMonth);

public sealed record SaveAthleteFeeRequest(decimal? MonthlyFee);

public sealed record AthleteFeeResponse(Guid AthleteProfileId, decimal? MonthlyFee);

public sealed record PaymentResponse(
    Guid Id,
    Guid AthleteProfileId,
    int Year,
    int Month,
    decimal Amount,
    decimal Balance,
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
            payment.Status == PaymentStatus.Paid ? 0m : payment.Amount,
            payment.Status,
            PaymentStatusCalculator.GetEffectiveStatus(payment, today),
            payment.PaidOn);
    }

    /// <summary>
    /// A due that has no recorded payment row yet, derived from the configured fee so members
    /// can see (and pay) the current month's dues before an admin touches them.
    /// </summary>
    public static PaymentResponse Synthetic(Guid athleteProfileId, int year, int month, decimal amount, DateOnly today)
    {
        var status = PaymentStatusCalculator.GetEffectiveStatus(year, month, today);
        return new PaymentResponse(
            Guid.Empty,
            athleteProfileId,
            year,
            month,
            amount,
            amount,
            status,
            status,
            null);
    }
}

public sealed record MonthlyPaymentResponse(
    Guid AthleteProfileId,
    string AthleteName,
    string ParentFullName,
    string ParentPhone,
    int Year,
    int Month,
    Guid? PaymentId,
    decimal? Amount,
    decimal? Balance,
    decimal? MonthlyFeeOverride,
    bool IsActive,
    PaymentStatus? Status,
    PaymentStatus EffectiveStatus,
    DateOnly? PaidOn)
{
    public static MonthlyPaymentResponse From(
        AthleteProfile athlete,
        StudentPayment? payment,
        int year,
        int month,
        DateOnly today,
        decimal? effectiveFee,
        bool isActive)
    {
        // When no payment row exists yet, the expected amount comes from the configured fee.
        var amount = payment?.Amount ?? effectiveFee;
        var balance = amount is null || payment?.Status == PaymentStatus.Paid ? 0m : amount.Value;
        return new MonthlyPaymentResponse(
            athlete.Id,
            $"{athlete.FirstName} {athlete.LastName}",
            athlete.ParentFullName,
            athlete.ParentPhone,
            year,
            month,
            payment?.Id,
            amount,
            amount is null ? null : balance,
            athlete.MonthlyFeeOverride,
            isActive,
            payment?.Status,
            payment is null
                ? PaymentStatusCalculator.GetEffectiveStatus(year, month, today)
                : PaymentStatusCalculator.GetEffectiveStatus(payment, today),
            payment?.PaidOn);
    }
}
