import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/core/queryClient";
import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type { CoachAttendanceRosterResponse, CoachGroupResponse, CoachSummaryResponse, CoachTrainingItem, SaveCoachAttendanceRequest } from "@/features/coach/types";

export function useCoachSummary(enabled = true) {
  return useQuery({ enabled, queryKey: ["coach", "summary"], queryFn: () => apiRequest<CoachSummaryResponse>(endpoints.coachSummary) });
}

export function useCoachGroups(enabled = true) {
  return useQuery({ enabled, queryKey: ["coach", "groups"], queryFn: () => apiRequest<CoachGroupResponse[]>(endpoints.coachGroups) });
}

export function useCoachTrainings(enabled = true) {
  return useQuery({ enabled, queryKey: ["coach", "trainings"], queryFn: () => apiRequest<CoachTrainingItem[]>(endpoints.coachTrainings) });
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
