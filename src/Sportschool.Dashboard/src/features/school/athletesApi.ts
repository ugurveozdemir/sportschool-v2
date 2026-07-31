import { apiRequest } from "../../app/api/apiClient";

export type PreferredFoot = "Unknown" | "Right" | "Left" | "Both";

export type Athlete = {
  id: string;
  schoolId: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  preferredFoot: PreferredFoot;
  parentFullName: string;
  parentPhone: string;
  profileImageUrl: string | null;
};

export type AthleteDetail = Athlete & {
  email: string;
  parentEmail: string | null;
  createdAt: string;
  groups: AthleteGroup[];
};

export type AthleteGroup = {
  id: string;
  name: string;
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
  preferredFoot: PreferredFoot;
  groupId?: string;
};

export function listAthletes(search: string): Promise<Athlete[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<Athlete[]>(`/api/school/athletes${query}`);
}

export function getAthlete(athleteId: string): Promise<AthleteDetail> {
  return apiRequest<AthleteDetail>(`/api/school/athletes/${athleteId}`);
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
