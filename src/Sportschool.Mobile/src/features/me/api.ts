import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type { AttendanceResponse, AthleteReportResponse, DevelopmentSummaryResponse, GroupResponse, MobileAthleteResponse, MobileProfileResponse, PaymentResponse, TrainingResponse } from "@/features/me/types";

type TrainingRange = {
  from: string;
  to: string;
};

export function useMyAthletes(enabled = true) {
  return useQuery({ enabled, queryKey: ["me", "athletes"], queryFn: () => apiRequest<MobileAthleteResponse[]>(endpoints.meAthletes) });
}

export function useProfile(enabled = true, athleteProfileId?: string | null) {
  return useQuery({
    enabled,
    queryKey: ["me", "profile", athleteProfileId],
    queryFn: () => apiRequest<MobileProfileResponse>(withAthlete(endpoints.meProfile, athleteProfileId)),
    refetchOnMount: "always"
  });
}

export function useGroups(enabled = true, athleteProfileId?: string | null) {
  return useQuery({ enabled, queryKey: ["me", "groups", athleteProfileId], queryFn: () => apiRequest<GroupResponse[]>(withAthlete(endpoints.meGroups, athleteProfileId)) });
}

export function useTrainings(enabled = true, range?: TrainingRange, athleteProfileId?: string | null) {
  return useQuery({
    enabled,
    queryKey: ["me", "trainings", range?.from, range?.to, athleteProfileId],
    queryFn: () => apiRequest<TrainingResponse[]>(withParams(endpoints.meTrainings, { athleteProfileId, from: range?.from, to: range?.to }))
  });
}

export function useAttendance(enabled = true, athleteProfileId?: string | null) {
  return useQuery({ enabled, queryKey: ["me", "attendance", athleteProfileId], queryFn: () => apiRequest<AttendanceResponse[]>(withAthlete(endpoints.meAttendance, athleteProfileId)) });
}

export function usePayments(enabled = true, athleteProfileId?: string | null) {
  return useQuery({ enabled, queryKey: ["me", "payments", athleteProfileId], queryFn: () => apiRequest<PaymentResponse[]>(withAthlete(endpoints.mePayments, athleteProfileId)) });
}

export function useReports(enabled = true, athleteProfileId?: string | null) {
  return useQuery({ enabled, queryKey: ["me", "athlete-reports", athleteProfileId], queryFn: () => apiRequest<AthleteReportResponse[]>(withAthlete(endpoints.meAthleteReports, athleteProfileId)) });
}

export function useDevelopmentSummary(enabled = true, athleteProfileId?: string | null) {
  return useQuery({
    enabled,
    queryKey: ["me", "development-summary", athleteProfileId],
    queryFn: () => apiRequest<DevelopmentSummaryResponse>(withAthlete(endpoints.meDevelopmentSummary, athleteProfileId))
  });
}

function withAthlete(path: string, athleteProfileId?: string | null) {
  return withParams(path, { athleteProfileId });
}

function withParams(path: string, values: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
