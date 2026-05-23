import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { SchoolAdminResponse, SchoolResponse } from "../../../shared/types/domain";

export type CreateSchoolRequest = {
  name: string;
  code: string;
};

export type CreateSchoolAdminRequest = {
  email: string;
  fullName: string;
};

export function listSchools() {
  return apiRequest<SchoolResponse[]>(endpoints.platformSchools);
}

export function createSchool(request: CreateSchoolRequest) {
  return apiRequest<SchoolResponse>(endpoints.platformSchools, { method: "POST", body: request });
}

export function deactivateSchool(schoolId: string) {
  return apiRequest<void>(endpoints.platformSchool(schoolId), { method: "DELETE" });
}

export function listSchoolAdmins(schoolId: string) {
  return apiRequest<SchoolAdminResponse[]>(endpoints.platformSchoolAdmins(schoolId));
}

export function createSchoolAdmin(schoolId: string, request: CreateSchoolAdminRequest) {
  return apiRequest<SchoolAdminResponse>(endpoints.platformSchoolAdmins(schoolId), { method: "POST", body: request });
}
