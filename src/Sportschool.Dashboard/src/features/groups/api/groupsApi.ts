import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { GroupResponse } from "../../../shared/types/domain";

export type SaveGroupRequest = {
  name: string;
  description?: string | null;
};

export function listGroups() {
  return apiRequest<GroupResponse[]>(endpoints.schoolGroups);
}

export function createGroup(request: SaveGroupRequest) {
  return apiRequest<GroupResponse>(endpoints.schoolGroups, { method: "POST", body: request });
}

export function updateGroup(groupId: string, request: SaveGroupRequest) {
  return apiRequest<GroupResponse>(endpoints.schoolGroup(groupId), { method: "PUT", body: request });
}

export function deactivateGroup(groupId: string) {
  return apiRequest<void>(endpoints.schoolGroup(groupId), { method: "DELETE" });
}

export function addAthleteToGroup(groupId: string, athleteProfileId: string) {
  return apiRequest<void>(endpoints.groupAthlete(groupId, athleteProfileId), { method: "POST" });
}

export function removeAthleteFromGroup(groupId: string, athleteProfileId: string) {
  return apiRequest<void>(endpoints.groupAthlete(groupId, athleteProfileId), { method: "DELETE" });
}
