import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { TrainingRecurrence } from "../../../shared/constants/domain";
import type { TrainingListResponse, TrainingResponse } from "../../../shared/types/domain";

export type CreateTrainingRequest = {
  groupId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  recurrence: TrainingRecurrence;
  recurrenceEndsOn?: string | null;
  location?: string | null;
  notes?: string | null;
};

export function createTraining(request: CreateTrainingRequest) {
  return apiRequest<TrainingResponse>(endpoints.schoolTrainings, { method: "POST", body: request });
}

export function listGroupTrainings(groupId: string) {
  return apiRequest<TrainingResponse[]>(endpoints.groupTrainings(groupId));
}

export type UpdateTrainingRequest = {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  notes?: string | null;
};

export function listTrainings(from: string, to: string) {
  const search = new URLSearchParams({ from, to });
  return apiRequest<TrainingListResponse[]>(`${endpoints.schoolTrainings}?${search}`);
}

export function updateTraining(trainingId: string, request: UpdateTrainingRequest) {
  return apiRequest<void>(`${endpoints.schoolTrainings}/${trainingId}`, { method: "PUT", body: request });
}

export function deactivateTraining(trainingId: string) {
  return apiRequest<void>(`${endpoints.schoolTrainings}/${trainingId}`, { method: "DELETE" });
}
