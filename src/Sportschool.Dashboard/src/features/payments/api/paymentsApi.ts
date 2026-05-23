import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { PaymentStatus } from "../../../shared/constants/domain";
import type { PaymentResponse } from "../../../shared/types/domain";

export type SavePaymentRequest = {
  amount: number;
  status: PaymentStatus;
  paidOn?: string | null;
};

export function listPayments(athleteProfileId: string) {
  return apiRequest<PaymentResponse[]>(endpoints.athletePayments(athleteProfileId));
}

export function upsertPayment(athleteProfileId: string, year: number, month: number, request: SavePaymentRequest) {
  return apiRequest<PaymentResponse>(endpoints.athletePayment(athleteProfileId, year, month), { method: "PUT", body: request });
}
