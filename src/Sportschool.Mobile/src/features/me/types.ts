import type { AttendanceStatus, PaymentStatus, TrainingRecurrence } from "@/shared/constants/domain";

export type MobileAthleteResponse = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  profileImageUrl: string | null;
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
  profileImageUrl: string | null;
};

export type GroupResponse = {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type TrainingGroupSummary = {
  id: string;
  name: string;
};

export type TrainingResponse = {
  id: string;
  groups: TrainingGroupSummary[];
  coachId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  recurrence: TrainingRecurrence;
  recurrenceEndsOn: string | null;
  location: string | null;
  notes: string | null;
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

export type PaymentResponse = {
  id: string;
  athleteProfileId: string;
  year: number;
  month: number;
  amount: number;
  amountPaid: number;
  balance: number;
  status: PaymentStatus;
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
