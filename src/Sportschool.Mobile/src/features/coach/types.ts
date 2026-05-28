import type { AttendanceStatus } from "@/shared/constants/domain";
import type { AthleteReportResponse } from "@/features/me/types";

export type CoachSummaryResponse = {
  todayTrainings: CoachTrainingItem[];
  weekTrainingCount: number;
  missingAttendanceCount: number;
  groupCount: number;
  athleteCount: number;
};

export type CoachGroupResponse = {
  id: string;
  name: string;
  description: string | null;
  athleteCount: number;
};

export type SchoolGroupResponse = {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type SaveSchoolGroupRequest = {
  name: string;
  description: string | null;
};

export type CoachAthleteListItem = {
  athleteProfileId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentFullName: string;
  parentPhone: string;
  groups: string[];
  latestAverageScore: number | null;
};

export type CoachAthleteDetailResponse = {
  athleteProfileId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentFullName: string;
  parentPhone: string;
  groups: string[];
  reports: AthleteReportResponse[];
};

export type CoachTrainingItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groupId: string;
  groupName: string;
  location: string | null;
  totalAthletes: number;
  recordedAttendanceCount: number;
};

export type CreateCoachTrainingRequest = {
  groupId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  recurrence: "None" | "Weekly";
  recurrenceEndsOn: string | null;
  location: string | null;
  notes: string | null;
};

export type CoachAttendanceRosterResponse = {
  training: CoachAttendanceRosterTraining;
  athletes: CoachAttendanceRosterItem[];
};

export type CoachAttendanceRosterTraining = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groupId: string;
  groupName: string;
  location: string | null;
};

export type CoachAttendanceRosterItem = {
  athleteProfileId: string;
  firstName: string;
  lastName: string;
  parentFullName: string;
  parentPhone: string;
  status: AttendanceStatus | null;
};

export type SaveCoachAttendanceRequest = {
  athleteProfileId: string;
  status: AttendanceStatus;
};

export type SaveCoachAthleteReportRequest = {
  athleteProfileId: string;
  summary: string;
  improvementAreas: string;
  speedScore: number;
  strengthScore: number;
  dribblingScore: number;
  shootingScore: number;
};
