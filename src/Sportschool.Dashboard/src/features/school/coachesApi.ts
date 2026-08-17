import { apiRequest } from "../../app/api/apiClient";

export type CoachGroup = {
  id: string;
  name: string;
};

export type CoachUpcomingTraining = {
  id: string;
  title: string;
  startsAt: string;
  groups: CoachGroup[];
};

export type Coach = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  roles: string[];
  nextTraining: CoachUpcomingTraining | null;
  upcomingTrainingCount: number;
};

export type PaginatedCoaches = {
  items: Coach[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type CoachProfileStats = {
  startedTrainingCount: number;
  completedTrainingCount: number;
  upcomingTrainingCount: number;
  inProgressTrainingCount: number;
  reportCount: number;
};

export type CoachTrainingHistory = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: "Scheduled" | "InProgress" | "Completed";
  groups: CoachGroup[];
};

export type CoachDetail = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  roles: string[];
  createdAt: string;
  stats: CoachProfileStats;
  nextTraining: CoachUpcomingTraining | null;
  groups: CoachGroup[];
  recentTrainings: CoachTrainingHistory[];
};

export type CreatedCoach = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  temporaryPassword: string | null;
  isReactivated: boolean;
};

export function listCoachRoster(search: string, page: number, pageSize: number): Promise<PaginatedCoaches> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set("search", search.trim());
  return apiRequest<PaginatedCoaches>(`/api/school/coaches?${params.toString()}`);
}

export function listCoaches(): Promise<Coach[]> {
  return apiRequest<Coach[]>("/api/school/coaches");
}

export function getCoach(coachId: string): Promise<CoachDetail> {
  return apiRequest<CoachDetail>(`/api/school/coaches/${coachId}`);
}

export function createCoach(input: { fullName: string; email: string }): Promise<CreatedCoach> {
  return apiRequest<CreatedCoach>("/api/school/coaches", { method: "POST", body: input });
}

export function deactivateCoach(userId: string): Promise<void> {
  return apiRequest<void>(`/api/school/coaches/${userId}`, { method: "DELETE" });
}
