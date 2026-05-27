import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/core/queryClient";
import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type {
  CoachAthleteDetailResponse,
  CoachAthleteListItem,
  CoachAttendanceRosterResponse,
  CoachGroupResponse,
  CoachSummaryResponse,
  CoachTrainingItem,
  CreateCoachTrainingRequest,
  SaveCoachAthleteReportRequest,
  SaveCoachAttendanceRequest
} from "@/features/coach/types";

type TrainingRange = {
  from: string;
  to: string;
};

export function useCoachSummary(enabled = true) {
  return useQuery({ enabled, queryKey: ["coach", "summary"], queryFn: () => apiRequest<CoachSummaryResponse>(endpoints.coachSummary) });
}

export function useCoachGroups(enabled = true) {
  return useQuery({ enabled, queryKey: ["coach", "groups"], queryFn: () => apiRequest<CoachGroupResponse[]>(endpoints.coachGroups) });
}

export function useCoachAthletes(enabled = true) {
  return useQuery({ enabled, queryKey: ["coach", "athletes"], queryFn: () => apiRequest<CoachAthleteListItem[]>(endpoints.coachAthletes) });
}

export function useCoachAthlete(athleteProfileId?: string) {
  return useQuery({
    enabled: Boolean(athleteProfileId),
    queryKey: ["coach", "athlete", athleteProfileId],
    queryFn: () => apiRequest<CoachAthleteDetailResponse>(endpoints.coachAthlete(athleteProfileId!))
  });
}

export function useCoachTrainings(enabled = true, range?: TrainingRange) {
  return useQuery({
    enabled,
    queryKey: ["coach", "trainings", range?.from, range?.to],
    queryFn: () => apiRequest<CoachTrainingItem[]>(withRange(endpoints.coachTrainings, range))
  });
}

export function useCreateCoachTraining() {
  return useMutation({
    mutationFn: (request: CreateCoachTrainingRequest) => apiRequest(endpoints.schoolTrainings, {
      method: "POST",
      body: request
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
    }
  });
}

export function useCoachAttendanceRoster(trainingId?: string) {
  return useQuery({
    enabled: Boolean(trainingId),
    queryKey: ["coach", "attendance-roster", trainingId],
    queryFn: () => apiRequest<CoachAttendanceRosterResponse>(endpoints.coachAttendanceRoster(trainingId!))
  });
}

export function useSaveCoachAttendance(trainingId?: string) {
  return useMutation({
    mutationFn: (request: SaveCoachAttendanceRequest & { existing: boolean }) => {
      const { existing, ...body } = request;
      if (!trainingId) {
        throw new Error("Training is required.");
      }
      const path = existing ? endpoints.coachAttendanceItem(trainingId, body.athleteProfileId) : endpoints.coachAttendance(trainingId);
      return apiRequest(path, {
        method: existing ? "PUT" : "POST",
        body
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
    }
  });
}

export function useCreateCoachAthleteReport(athleteProfileId?: string) {
  return useMutation({
    mutationFn: (request: SaveCoachAthleteReportRequest) => {
      if (!athleteProfileId) {
        throw new Error("Athlete is required.");
      }
      return apiRequest(endpoints.coachAthleteReports(athleteProfileId), {
        method: "POST",
        body: request
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach", "athletes"] });
      await queryClient.invalidateQueries({ queryKey: ["coach", "athlete", athleteProfileId] });
    }
  });
}

function withRange(path: string, range?: TrainingRange) {
  if (!range) {
    return path;
  }

  const params = new URLSearchParams({ from: range.from, to: range.to });
  return `${path}?${params.toString()}`;
}
