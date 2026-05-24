import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { AthleteRosterResponse, SchoolAdminResponse, SchoolUserResponse } from "../../../shared/types/domain";

export type CreateCoachRequest = {
  email: string;
  fullName: string;
};

export function listUsers() {
  return apiRequest<SchoolUserResponse[]>(endpoints.schoolUsers);
}

export function listCoaches() {
  return apiRequest<SchoolUserResponse[]>(endpoints.schoolCoaches);
}

export function createCoach(request: CreateCoachRequest) {
  return apiRequest<SchoolAdminResponse>(endpoints.schoolCoaches, { method: "POST", body: request });
}

export function listAthletes(search?: string) {
  const query = search?.trim() ? `?${new URLSearchParams({ search: search.trim() })}` : "";
  return apiRequest<AthleteRosterResponse[]>(`${endpoints.schoolAthletes}${query}`);
}
