import { apiRequest } from "../../../shared/api/apiClient";
import { endpoints } from "../../../shared/constants/endpoints";
import type { AttendanceStatus } from "../../../shared/constants/domain";
import type { AttendanceResponse, AttendanceRosterResponse } from "../../../shared/types/domain";

export type SaveAttendanceRequest = {
  athleteProfileId: string;
  status: AttendanceStatus;
};

export function listAttendance(trainingId: string) {
  return apiRequest<AttendanceResponse[]>(endpoints.trainingAttendance(trainingId));
}

export function getAttendanceRoster(trainingId: string) {
  return apiRequest<AttendanceRosterResponse>(endpoints.attendanceRoster(trainingId));
}

export function createAttendance(trainingId: string, request: SaveAttendanceRequest) {
  return apiRequest<AttendanceResponse>(endpoints.trainingAttendance(trainingId), { method: "POST", body: request });
}

export function updateAttendance(trainingId: string, athleteProfileId: string, request: SaveAttendanceRequest) {
  return apiRequest<AttendanceResponse>(endpoints.trainingAthleteAttendance(trainingId, athleteProfileId), {
    method: "PUT",
    body: request
  });
}
