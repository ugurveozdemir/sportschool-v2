import { apiRequest } from "../../shared/api/apiClient";
import { endpoints } from "../../shared/constants/endpoints";
import type {
  CreatedSchoolAdmin,
  CreateSchoolAdminInput,
  CreateSchoolInput,
  School,
  SchoolAdmin
} from "./types";

export function listSchools(search?: string): Promise<School[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<School[]>(`${endpoints.platformSchools}${query}`);
}

export function createSchool(input: CreateSchoolInput): Promise<School> {
  return apiRequest<School>(endpoints.platformSchools, { method: "POST", body: input });
}

export function deactivateSchool(schoolId: string): Promise<void> {
  return apiRequest<void>(endpoints.platformSchool(schoolId), { method: "DELETE" });
}

export function listSchoolAdmins(schoolId: string): Promise<SchoolAdmin[]> {
  return apiRequest<SchoolAdmin[]>(endpoints.platformSchoolAdmins(schoolId));
}

export function createSchoolAdmin(
  schoolId: string,
  input: CreateSchoolAdminInput
): Promise<CreatedSchoolAdmin> {
  return apiRequest<CreatedSchoolAdmin>(endpoints.platformSchoolAdmins(schoolId), {
    method: "POST",
    body: input
  });
}

export function removeSchoolAdmin(schoolId: string, adminId: string): Promise<void> {
  return apiRequest<void>(endpoints.platformSchoolAdmin(schoolId, adminId), { method: "DELETE" });
}
