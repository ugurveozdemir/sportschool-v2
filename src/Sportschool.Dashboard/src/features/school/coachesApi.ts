import { apiRequest } from "../../app/api/apiClient";

export type Coach = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  roles: string[];
};

export type CreatedCoach = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  temporaryPassword: string | null;
};

export function listCoaches(): Promise<Coach[]> {
  return apiRequest<Coach[]>("/api/school/coaches");
}

export function createCoach(input: { fullName: string; email: string }): Promise<CreatedCoach> {
  return apiRequest<CreatedCoach>("/api/school/coaches", { method: "POST", body: input });
}

export function deactivateCoach(userId: string): Promise<void> {
  return apiRequest<void>(`/api/school/coaches/${userId}`, { method: "DELETE" });
}
