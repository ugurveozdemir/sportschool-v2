import type { AttendanceStatus } from "@/shared/constants/domain";

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
