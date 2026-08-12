import { apiRequest } from "../../app/api/apiClient";

export type TrainingGroup = {
  id: string;
  name: string;
};

export type Training = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groups: TrainingGroup[];
  coachId: string;
  coachName: string;
  location: string | null;
  notes: string | null;
  startedAt: string | null;
  startedByUserId: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  attendanceSummary: {
    totalAthletes: number;
    recordedCount: number;
  };
};

export type TrainingInput = {
  groupIds: string[];
  title: string;
  startsAt: string;
  endsAt: string;
  recurrence: "None" | "Weekly";
  recurrenceEndsOn: string | null;
  location: string | null;
  notes: string | null;
  coachId: string;
};

export function listTrainings(from: Date, to: Date): Promise<Training[]> {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiRequest<Training[]>(`/api/school/trainings?${query}`);
}

export function createTraining(input: TrainingInput): Promise<Training> {
  return apiRequest<Training>("/api/school/trainings", { method: "POST", body: input });
}

export function updateTraining(trainingId: string, input: TrainingInput): Promise<void> {
  const updateInput = {
    groupIds: input.groupIds,
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    location: input.location,
    notes: input.notes,
    coachId: input.coachId
  };
  return apiRequest<void>(`/api/school/trainings/${trainingId}`, { method: "PUT", body: updateInput });
}

export function deactivateTraining(trainingId: string): Promise<void> {
  return apiRequest<void>(`/api/school/trainings/${trainingId}`, { method: "DELETE" });
}
