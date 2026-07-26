import { apiRequest } from "../../app/api/apiClient";

export type Athlete = {
  id: string;
  schoolId: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentFullName: string;
  parentPhone: string;
  profileImageUrl: string | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type CreateAthleteInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  athleteEmail: string;
  athletePassword: string;
  parentFullName: string;
  parentPhone: string;
  parentEmail: string;
  parentPassword: string;
  groupId?: string;
};

export function listAthletes(search: string): Promise<Athlete[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<Athlete[]>(`/api/school/athletes${query}`);
}

export function createAthlete(input: CreateAthleteInput): Promise<Athlete> {
  return apiRequest<Athlete>("/api/school/athletes", { method: "POST", body: { ...input, groupId: input.groupId ?? null } });
}

export function deactivateAthlete(athleteId: string): Promise<void> {
  return apiRequest<void>(`/api/school/athletes/${athleteId}`, { method: "DELETE" });
}

export function listGroups(): Promise<Group[]> {
  return apiRequest<Group[]>("/api/school/groups/");
}
