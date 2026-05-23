import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { TrainingRecurrence } from "../../../shared/constants/domain";
import type { TrainingResponse } from "../../../shared/types/domain";

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
