namespace Sportschool.Api.Features.Payments;

public static class PaymentStatusCalculator
{
    public static PaymentStatus GetEffectiveStatus(StudentPayment payment, DateOnly today)
    {
        if (payment.Status == PaymentStatus.Paid)
        {
            return PaymentStatus.Paid;
        }

        var paymentMonth = new DateOnly(payment.Year, payment.Month, 1);
        var currentMonth = new DateOnly(today.Year, today.Month, 1);
        return paymentMonth <= currentMonth ? PaymentStatus.Unpaid : PaymentStatus.Pending;
    }
}
