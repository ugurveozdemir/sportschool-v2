import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type {
  AttendanceResponse,
  AthleteReportResponse,
  GroupResponse,
  MobileProfileResponse,
  PaymentResponse,
  TrainingResponse
} from "../../../shared/types/domain";

export function getMyProfile() {
  return apiRequest<MobileProfileResponse>(endpoints.meProfile);
}

export function listMyGroups() {
  return apiRequest<GroupResponse[]>(endpoints.meGroups);
}

export function listMyTrainings() {
  return apiRequest<TrainingResponse[]>(endpoints.meTrainings);
}

export function listMyAttendance() {
  return apiRequest<AttendanceResponse[]>(endpoints.meAttendance);
}

export function listMyPayments() {
  return apiRequest<PaymentResponse[]>(endpoints.mePayments);
}

export function listMyReports() {
  return apiRequest<AthleteReportResponse[]>(endpoints.meAthleteReports);
}
