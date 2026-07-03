namespace Sportschool.Api.Features.Payments;

public static class PaymentStatusCalculator
{
    public static PaymentStatus GetEffectiveStatus(StudentPayment payment, DateOnly today)
    {
        if (payment.Status == PaymentStatus.Paid)
        {
            return PaymentStatus.Paid;
        }

        return GetEffectiveStatus(payment.Year, payment.Month, today);
    }

    /// <summary>
    /// Effective status for a month that has no recorded payment yet: due (Unpaid) once its own
    /// month has arrived, otherwise upcoming (Pending).
    /// </summary>
    public static PaymentStatus GetEffectiveStatus(int year, int month, DateOnly today)
    {
        var paymentMonth = new DateOnly(year, month, 1);
        var currentMonth = new DateOnly(today.Year, today.Month, 1);
        return paymentMonth <= currentMonth ? PaymentStatus.Unpaid : PaymentStatus.Pending;
    }
}
