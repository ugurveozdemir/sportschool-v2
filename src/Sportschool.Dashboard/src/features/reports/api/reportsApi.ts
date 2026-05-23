import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { AthleteReportResponse } from "../../../shared/types/domain";

export type SaveAthleteReportRequest = {
  athleteProfileId: string;
  summary: string;
  improvementAreas: string;
  speedScore: number;
  strengthScore: number;
  dribblingScore: number;
  shootingScore: number;
};

export function createReport(request: SaveAthleteReportRequest) {
  return apiRequest<AthleteReportResponse>(endpoints.athleteReports, { method: "POST", body: request });
}

export function updateReport(reportId: string, request: SaveAthleteReportRequest) {
  return apiRequest<AthleteReportResponse>(endpoints.athleteReport(reportId), { method: "PUT", body: request });
}

export function listReports(athleteProfileId: string) {
  return apiRequest<AthleteReportResponse[]>(endpoints.schoolAthleteReports(athleteProfileId));
}
