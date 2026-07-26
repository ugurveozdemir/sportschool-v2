import { apiRequest } from "../../app/api/apiClient";

export type School = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type SchoolAdmin = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
};

export function listSchools(search: string): Promise<School[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<School[]>(`/api/platform/schools${query}`);
}

export function createSchool(input: { name: string; code: string }): Promise<School> {
  return apiRequest<School>("/api/platform/schools", { method: "POST", body: input });
}

export function updateSchool(schoolId: string, input: { name: string }): Promise<School> {
  return apiRequest<School>(`/api/platform/schools/${schoolId}`, { method: "PUT", body: input });
}

export function deactivateSchool(schoolId: string): Promise<void> {
  return apiRequest<void>(`/api/platform/schools/${schoolId}`, { method: "DELETE" });
}

export function listSchoolAdmins(schoolId: string): Promise<SchoolAdmin[]> {
  return apiRequest<SchoolAdmin[]>(`/api/platform/schools/${schoolId}/admins`);
}

export function createSchoolAdmin(schoolId: string, input: { fullName: string; email: string; password: string }): Promise<SchoolAdmin> {
  return apiRequest<SchoolAdmin>(`/api/platform/schools/${schoolId}/admins`, { method: "POST", body: input });
}

export function updateSchoolAdminPassword(schoolId: string, adminId: string, password: string): Promise<void> {
  return apiRequest<void>(`/api/platform/schools/${schoolId}/admins/${adminId}/password`, { method: "PUT", body: { password } });
}

export function removeSchoolAdmin(schoolId: string, adminId: string): Promise<void> {
  return apiRequest<void>(`/api/platform/schools/${schoolId}/admins/${adminId}`, { method: "DELETE" });
}
