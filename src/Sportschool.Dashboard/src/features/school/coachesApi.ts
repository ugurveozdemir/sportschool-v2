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

export type CreatedCoach = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  temporaryPassword: string | null;
};

export function listCoachRoster(search: string, page: number, pageSize: number): Promise<PaginatedCoaches> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set("search", search.trim());
  return apiRequest<PaginatedCoaches>(`/api/school/coaches?${params.toString()}`);
}

export function listCoaches(): Promise<Coach[]> {
  return apiRequest<Coach[]>("/api/school/coaches");
}

export function createCoach(input: { fullName: string; email: string }): Promise<CreatedCoach> {
  return apiRequest<CreatedCoach>("/api/school/coaches", { method: "POST", body: input });
}

export function deactivateCoach(userId: string): Promise<void> {
  return apiRequest<void>(`/api/school/coaches/${userId}`, { method: "DELETE" });
}
