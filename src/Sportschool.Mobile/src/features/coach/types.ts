import type { AttendanceStatus, PaymentStatus } from "@/shared/constants/domain";
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

export type GroupAthleteResponse = {
  id: string;
  firstName: string;
  lastName: string;
  parentFullName: string;
  parentPhone: string;
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

export type TrainingGroupSummary = {
  id: string;
  name: string;
};

export type CoachTrainingItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groups: TrainingGroupSummary[];
  location: string | null;
  totalAthletes: number;
  recordedAttendanceCount: number;
  notes: string | null;
};

export type CreateCoachTrainingRequest = {
  groupIds: string[];
  title: string;
  startsAt: string;
  endsAt: string;
  recurrence: "None" | "Weekly";
  recurrenceEndsOn: string | null;
  location: string | null;
  notes: string | null;
};

export type UpdateCoachTrainingRequest = {
  groupIds: string[];
  title: string;
  startsAt: string;
  endsAt: string;
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
  groups: TrainingGroupSummary[];
  location: string | null;
  notes: string | null;
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

export type SchoolMonthlyPaymentResponse = {
  athleteProfileId: string;
  athleteName: string;
  parentFullName: string;
  parentPhone: string;
  year: number;
  month: number;
  paymentId: string | null;
  amount: number | null;
  amountPaid: number | null;
  balance: number | null;
  monthlyFeeOverride: number | null;
  isActive: boolean;
  status: PaymentStatus | null;
  effectiveStatus: PaymentStatus;
  paidOn: string | null;
};

export type SavePaymentRequest = {
  amount: number;
  amountPaid: number | null;
  status: PaymentStatus;
  paidOn: string | null;
};

export type PaymentSettingsResponse = {
  defaultMonthlyFee: number | null;
  paymentDayOfMonth: number | null;
};

export type SavePaymentSettingsRequest = {
  defaultMonthlyFee: number | null;
  paymentDayOfMonth: number | null;
};

export type SaveAthleteFeeRequest = {
  monthlyFee: number | null;
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
