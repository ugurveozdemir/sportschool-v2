import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { AthleteApplicationDecisionResponse, AthleteApplicationResponse } from "../../../shared/types/domain";

export type CreateAthleteApplicationRequest = {
  schoolCode: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteBirthDate: string;
  athleteEmail: string;
  password: string;
  parentFullName: string;
  parentPhone: string;
};

export function createAthleteApplication(request: CreateAthleteApplicationRequest) {
  return apiRequest<AthleteApplicationResponse>(endpoints.athleteApplications, {
    method: "POST",
    body: request,
    auth: false
  });
}

export function listAthleteApplications() {
  return apiRequest<AthleteApplicationResponse[]>(endpoints.schoolAthleteApplications);
}

export function approveAthleteApplication(applicationId: string) {
  return apiRequest<AthleteApplicationDecisionResponse>(endpoints.approveAthleteApplication(applicationId), { method: "POST" });
}

export function rejectAthleteApplication(applicationId: string) {
  return apiRequest<AthleteApplicationDecisionResponse>(endpoints.rejectAthleteApplication(applicationId), { method: "POST" });
}
