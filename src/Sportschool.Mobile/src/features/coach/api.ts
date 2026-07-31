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
  PaymentSettingsResponse,
  SaveAthleteFeeRequest,
  SaveSchoolGroupRequest,
  SaveCoachAthleteReportRequest,
  SaveCoachAttendanceRequest,
  SaveCoachAttendanceBatchRequest,
  SaveTrainingReportRequest,
  SavePaymentRequest,
  SavePaymentSettingsRequest,
  SchoolGroupResponse,
  SchoolMonthlyPaymentResponse,
  UpdateCoachTrainingRequest
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

export function useUpdateCoachTraining(trainingId?: string) {
  return useMutation({
    mutationFn: (request: UpdateCoachTrainingRequest) => {
      if (!trainingId) {
        throw new Error("Training is required.");
      }

      return apiRequest(endpoints.schoolTraining(trainingId), {
        method: "PUT",
        body: request
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
      await queryClient.invalidateQueries({ queryKey: ["coach", "attendance-roster", trainingId] });
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

export type SaveCoachAttendanceItem = SaveCoachAttendanceRequest & { existing: boolean };

export function useSaveCoachAttendanceBatch(trainingId?: string) {
  return useMutation({
    mutationFn: async (items: SaveCoachAttendanceItem[]) => {
      if (!trainingId) {
        throw new Error("Training is required.");
      }

      const body: SaveCoachAttendanceBatchRequest = {
        items: items.map(({ athleteProfileId, status }) => ({ athleteProfileId, status }))
      };
      await apiRequest(endpoints.coachAttendanceBatch(trainingId), { method: "PUT", body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
    }
  });
}

export function useStartCoachTraining(trainingId?: string) {
  return useMutation({
    mutationFn: () => {
      if (!trainingId) {
        throw new Error("Training is required.");
      }
      return apiRequest(endpoints.coachStartTraining(trainingId), { method: "POST" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
      await queryClient.invalidateQueries({ queryKey: ["coach", "attendance-roster", trainingId] });
    }
  });
}

export function useCompleteCoachTraining(trainingId?: string) {
  return useMutation({
    mutationFn: () => {
      if (!trainingId) {
        throw new Error("Training is required.");
      }
      return apiRequest(endpoints.coachCompleteTraining(trainingId), { method: "POST" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach"] });
      await queryClient.invalidateQueries({ queryKey: ["coach", "attendance-roster", trainingId] });
    }
  });
}

export function useSaveTrainingReport(trainingId?: string, athleteProfileId?: string) {
  return useMutation({
    mutationFn: (request: SaveTrainingReportRequest) => {
      if (!trainingId || !athleteProfileId) {
        throw new Error("Training and athlete are required.");
      }
      return apiRequest(endpoints.coachTrainingReport(trainingId, athleteProfileId), { method: "PUT", body: request });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coach", "attendance-roster", trainingId] });
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

export function useSchoolMonthlyPayments(year: number, month: number, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["school", "payments", year, month],
    queryFn: () => apiRequest<SchoolMonthlyPaymentResponse[]>(`${endpoints.schoolPayments}?year=${year}&month=${month}`)
  });
}

export function useUpsertSchoolPayment(year: number, month: number) {
  return useMutation({
    mutationFn: ({ athleteProfileId, request }: { athleteProfileId: string; request: SavePaymentRequest }) =>
      apiRequest(endpoints.schoolAthletePayment(athleteProfileId, year, month), {
        method: "PUT",
        body: request
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school", "payments"] });
    }
  });
}

export function usePaymentSettings(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["school", "payment-settings"],
    queryFn: () => apiRequest<PaymentSettingsResponse>(endpoints.schoolPaymentSettings)
  });
}

export function useUpdatePaymentSettings() {
  return useMutation({
    mutationFn: (request: SavePaymentSettingsRequest) =>
      apiRequest<PaymentSettingsResponse>(endpoints.schoolPaymentSettings, { method: "PUT", body: request }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school", "payment-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["school", "payments"] });
    }
  });
}

export function useUpdateAthleteFee() {
  return useMutation({
    mutationFn: ({ athleteProfileId, request }: { athleteProfileId: string; request: SaveAthleteFeeRequest }) =>
      apiRequest(endpoints.schoolAthleteFee(athleteProfileId), { method: "PUT", body: request }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["school", "payments"] });
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
