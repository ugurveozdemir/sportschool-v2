import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type { AttendanceResponse, AthleteReportResponse, GroupResponse, MobileProfileResponse, PaymentResponse, TrainingResponse } from "@/features/me/types";

export function useProfile() {
  return useQuery({ queryKey: ["me", "profile"], queryFn: () => apiRequest<MobileProfileResponse>(endpoints.meProfile) });
}

export function useGroups() {
  return useQuery({ queryKey: ["me", "groups"], queryFn: () => apiRequest<GroupResponse[]>(endpoints.meGroups) });
}

export function useTrainings() {
  return useQuery({ queryKey: ["me", "trainings"], queryFn: () => apiRequest<TrainingResponse[]>(endpoints.meTrainings) });
}

export function useAttendance() {
  return useQuery({ queryKey: ["me", "attendance"], queryFn: () => apiRequest<AttendanceResponse[]>(endpoints.meAttendance) });
}

export function usePayments() {
  return useQuery({ queryKey: ["me", "payments"], queryFn: () => apiRequest<PaymentResponse[]>(endpoints.mePayments) });
}

export function useReports() {
  return useQuery({ queryKey: ["me", "athlete-reports"], queryFn: () => apiRequest<AthleteReportResponse[]>(endpoints.meAthleteReports) });
}
