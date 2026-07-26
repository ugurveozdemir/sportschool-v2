import { apiRequest } from "../../app/api/apiClient";

export type SchoolGroup = {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type GroupAthlete = {
  id: string;
  firstName: string;
  lastName: string;
  parentFullName: string;
  parentPhone: string;
  profileImageUrl: string | null;
};

export function listGroups(): Promise<SchoolGroup[]> {
  return apiRequest<SchoolGroup[]>("/api/school/groups/");
}

export function createGroup(input: { name: string; description?: string }): Promise<SchoolGroup> {
  return apiRequest<SchoolGroup>("/api/school/groups/", { method: "POST", body: input });
}

export function updateGroup(groupId: string, input: { name: string; description?: string }): Promise<SchoolGroup> {
  return apiRequest<SchoolGroup>(`/api/school/groups/${groupId}`, { method: "PUT", body: input });
}

export function deactivateGroup(groupId: string): Promise<void> {
  return apiRequest<void>(`/api/school/groups/${groupId}`, { method: "DELETE" });
}

export function listGroupAthletes(groupId: string): Promise<GroupAthlete[]> {
  return apiRequest<GroupAthlete[]>(`/api/school/groups/${groupId}/athletes`);
}

export function addAthleteToGroup(groupId: string, athleteId: string): Promise<void> {
  return apiRequest<void>(`/api/school/groups/${groupId}/athletes/${athleteId}`, { method: "POST" });
}

export function removeAthleteFromGroup(groupId: string, athleteId: string): Promise<void> {
  return apiRequest<void>(`/api/school/groups/${groupId}/athletes/${athleteId}`, { method: "DELETE" });
}
