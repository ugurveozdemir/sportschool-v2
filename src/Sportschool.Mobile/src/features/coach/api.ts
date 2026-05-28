import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/core/queryClient";
import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type {
  AthleteRosterResponse,
  CoachAthleteDetailResponse,
  CoachAthleteListItem,
  CoachAttendanceRosterResponse,
  CoachGroupResponse,
  CoachSummaryResponse,
  CoachTrainingItem,
  CreateCoachTrainingRequest,
  GroupAthleteResponse,
  SaveSchoolGroupRequest,
  SaveCoachAthleteReportRequest,
  SaveCoachAttendanceRequest,
  SchoolGroupResponse
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

export function useSchoolGroups(enabled = true) {
  return useQuery({ enabled, queryKey: ["school", "groups"], queryFn: () => apiRequest<SchoolGroupResponse[]>(endpoints.schoolGroups) });
}

export function useCreateSchoolGroup() {
  return useMutation({
    mutationFn: (request: SaveSchoolGroupRequest) => apiRequest<SchoolGroupResponse>(endpoints.schoolGroups, {
      method: "POST",
      body: request
    }),
    onSuccess: invalidateGroups
  });
}

export function useUpdateSchoolGroup(groupId?: string) {
  return useMutation({
    mutationFn: (request: SaveSchoolGroupRequest) => {
      if (!groupId) {
        throw new Error("Group is required.");
      }

      return apiRequest<SchoolGroupResponse>(endpoints.schoolGroup(groupId), {
        method: "PUT",
        body: request
      });
    },
    onSuccess: invalidateGroups
  });
}

export function useDeleteSchoolGroup() {
  return useMutation({
    mutationFn: (groupId: string) => apiRequest(endpoints.schoolGroup(groupId), { method: "DELETE" }),
    onSuccess: invalidateGroups
  });
}

export function useGroupAthletes(groupId?: string) {
  return useQuery({
    enabled: Boolean(groupId),
    queryKey: ["school", "group-athletes", groupId],
    queryFn: () => apiRequest<GroupAthleteResponse[]>(endpoints.schoolGroupAthletes(groupId!))
  });
}

export function useAddAthleteToGroup(groupId?: string) {
  return useMutation({
    mutationFn: (athleteProfileId: string) => {
      if (!groupId) {
        throw new Error("Group is required.");
      }
      return apiRequest(endpoints.schoolGroupAthlete(groupId, athleteProfileId), { method: "POST" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school", "group-athletes", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["school", "athletes"] });
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
    }
  });
}

export function useRemoveAthleteFromGroup(groupId?: string) {
  return useMutation({
    mutationFn: (athleteProfileId: string) => {
      if (!groupId) {
        throw new Error("Group is required.");
      }
      return apiRequest(endpoints.schoolGroupAthlete(groupId, athleteProfileId), { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school", "group-athletes", groupId] });
      await queryClient.invalidateQueries({ queryKey: ["school", "athletes"] });
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
    }
  });
}

export function useCoachAthletes(enabled = true) {
  return useQuery({ enabled, queryKey: ["coach", "athletes"], queryFn: () => apiRequest<CoachAthleteListItem[]>(endpoints.coachAthletes) });
}

export function useSchoolAthletes(enabled = true) {
  return useQuery({ enabled, queryKey: ["school", "athletes"], queryFn: () => apiRequest<AthleteRosterResponse[]>(endpoints.schoolAthletes) });
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

async function invalidateGroups() {
  await queryClient.invalidateQueries({ queryKey: ["school", "groups"] });
  await queryClient.invalidateQueries({ queryKey: ["coach"] });
}
