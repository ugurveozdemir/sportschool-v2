import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type { AttendanceResponse, AthleteReportResponse, GroupResponse, MobileProfileResponse, PaymentResponse, TrainingResponse } from "@/features/me/types";

type TrainingRange = {
  from: string;
  to: string;
};

export function useProfile(enabled = true) {
  return useQuery({ enabled, queryKey: ["me", "profile"], queryFn: () => apiRequest<MobileProfileResponse>(endpoints.meProfile) });
}

export function useGroups(enabled = true) {
  return useQuery({ enabled, queryKey: ["me", "groups"], queryFn: () => apiRequest<GroupResponse[]>(endpoints.meGroups) });
}

export function useTrainings(enabled = true, range?: TrainingRange) {
  return useQuery({
    enabled,
    queryKey: ["me", "trainings", range?.from, range?.to],
    queryFn: () => apiRequest<TrainingResponse[]>(withRange(endpoints.meTrainings, range))
  });
}

export function useAttendance(enabled = true) {
  return useQuery({ enabled, queryKey: ["me", "attendance"], queryFn: () => apiRequest<AttendanceResponse[]>(endpoints.meAttendance) });
}

export function usePayments(enabled = true) {
  return useQuery({ enabled, queryKey: ["me", "payments"], queryFn: () => apiRequest<PaymentResponse[]>(endpoints.mePayments) });
}

export function useReports(enabled = true) {
  return useQuery({ enabled, queryKey: ["me", "athlete-reports"], queryFn: () => apiRequest<AthleteReportResponse[]>(endpoints.meAthleteReports) });
}

function withRange(path: string, range?: TrainingRange) {
  if (!range) {
    return path;
  }

  const params = new URLSearchParams({ from: range.from, to: range.to });
  return `${path}?${params.toString()}`;
}
