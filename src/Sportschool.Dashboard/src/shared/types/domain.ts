import type {
  AthleteApplicationStatus,
  AttendanceStatus,
  PaymentStatus,
  TrainingRecurrence
} from "../constants/domain";
import type { LoginMode } from "../constants/roles";

export type HealthResponse = {
  status: string;
};

export type SchoolResponse = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type SchoolAdminResponse = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  temporaryPassword?: string | null;
};

export type SchoolUserResponse = {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  roles: LoginMode[];
};

export type AthleteRosterResponse = {
  id: string;
  schoolId: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentFullName: string;
  parentPhone: string;
};

export type AthleteApplicationResponse = {
  id: string;
  schoolId: string;
  athleteFirstName: string;
  athleteLastName: string;
  athleteBirthDate: string;
  athleteEmail: string;
  parentFullName: string;
  parentPhone: string;
  status: AthleteApplicationStatus;
};

export type AthleteApplicationDecisionResponse = {
  id: string;
  status: AthleteApplicationStatus;
  approvedUserId: string | null;
};

export type GroupResponse = {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type GroupAthleteResponse = {
  id: string;
  firstName: string;
  lastName: string;
  parentFullName: string;
  parentPhone: string;
};

export type TrainingResponse = {
  id: string;
  groupId: string;
  coachId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  recurrence: TrainingRecurrence;
  recurrenceEndsOn: string | null;
  location: string | null;
  notes: string | null;
};

export type AttendanceSummary = {
  totalAthletes: number;
  recordedCount: number;
};

export type TrainingListResponse = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  location: string | null;
  attendanceSummary: AttendanceSummary;
};

export type AttendanceResponse = {
  id: string;
  trainingSessionId: string;
  athleteProfileId: string;
  status: AttendanceStatus;
  recordedByUserId: string;
  updatedByUserId: string | null;
  recordedAt: string;
  updatedAt: string | null;
};

export type AttendanceRosterResponse = {
  training: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    groupId: string;
    groupName: string;
  };
  athletes: AttendanceRosterItem[];
};

export type AttendanceRosterItem = {
  athleteProfileId: string;
  firstName: string;
  lastName: string;
  parentFullName: string;
  parentPhone: string;
  status: AttendanceStatus | null;
};

export type PaymentResponse = {
  id: string;
  athleteProfileId: string;
  year: number;
  month: number;
  amount: number;
  status: PaymentStatus;
  effectiveStatus: PaymentStatus;
  paidOn: string | null;
};

export type MonthlyPaymentResponse = {
  athleteProfileId: string;
  athleteName: string;
  parentFullName: string;
  parentPhone: string;
  year: number;
  month: number;
  paymentId: string | null;
  amount: number | null;
  status: PaymentStatus | null;
  effectiveStatus: PaymentStatus;
  paidOn: string | null;
};

export type AthleteReportResponse = {
  id: string;
  athleteProfileId: string;
  coachId: string;
  summary: string;
  improvementAreas: string;
  speedScore: number;
  strengthScore: number;
  dribblingScore: number;
  shootingScore: number;
  createdAt: string;
  updatedAt: string | null;
};

export type DashboardSummaryResponse = {
  todayTrainings: DashboardTrainingItem[];
  weekTrainingCount: number;
  missingAttendanceCount: number;
  activeAthleteCount: number;
  activeGroupCount: number;
  unpaidPaymentCount: number;
  recentReports: DashboardRecentReport[];
};

export type DashboardTrainingItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  location: string | null;
  totalAthletes: number;
  recordedAttendanceCount: number;
};

export type DashboardRecentReport = {
  id: string;
  athleteProfileId: string;
  athleteName: string;
  summary: string;
  createdAt: string;
};

export type MobileProfileResponse = {
  id: string;
  userId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentFullName: string;
  parentPhone: string;
};
