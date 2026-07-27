import { apiRequest } from "../../app/api/apiClient";

export type PaymentStatus = "Pending" | "Paid" | "Unpaid";
export type PaymentSettings = { defaultMonthlyFee: number | null; paymentDayOfMonth: number | null };
export type MonthlyPayment = { athleteProfileId: string; athleteName: string; parentFullName: string; parentPhone: string; year: number; month: number; paymentId: string | null; amount: number | null; balance: number | null; monthlyFeeOverride: number | null; isActive: boolean; status: PaymentStatus | null; effectiveStatus: PaymentStatus; paidOn: string | null };

export function getPaymentSettings(): Promise<PaymentSettings> { return apiRequest<PaymentSettings>("/api/school/payment-settings"); }
export function updatePaymentSettings(input: PaymentSettings): Promise<PaymentSettings> { return apiRequest<PaymentSettings>("/api/school/payment-settings", { method: "PUT", body: input }); }
export function listMonthlyPayments(year: number, month: number): Promise<MonthlyPayment[]> { return apiRequest<MonthlyPayment[]>(`/api/school/payments?year=${year}&month=${month}`); }
export function savePayment(athleteId: string, year: number, month: number, input: { amount: number; status: PaymentStatus; paidOn: string | null }): Promise<void> { return apiRequest<void>(`/api/school/athletes/${athleteId}/payments/${year}/${month}`, { method: "PUT", body: input }); }
