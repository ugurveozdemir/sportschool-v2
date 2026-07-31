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
  startedAt: string | null;
  startedByUserId: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
};

export type AttendanceResponse = {
  id: string;
  trainingSessionId: string;
  athleteProfileId: string;
  status: AttendanceStatus | null;
  recordedByUserId: string | null;
  updatedByUserId: string | null;
  recordedAt: string | null;
  updatedAt: string | null;
};

export type PaymentResponse = {
  id: string;
  athleteProfileId: string;
  year: number;
  month: number;
  amount: number;
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

export type TrainingReportResponse = {
  id: string;
  trainingSessionId: string;
  athleteProfileId: string;
  coachId: string;
  trainingTitle: string;
  trainingCompletedAt: string;
  nutritionScore: number;
  cognitiveDevelopmentScore: number;
  disciplineScore: number;
  physicalConditionScore: number;
  psychologicalDevelopmentScore: number;
  tacticalDevelopmentScore: number;
  technicalDevelopmentScore: number;
  coachNote: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type DevelopmentMetricAverages = {
  nutrition: number;
  cognitiveDevelopment: number;
  discipline: number;
  physicalCondition: number;
  psychologicalDevelopment: number;
  tacticalDevelopment: number;
  technicalDevelopment: number;
};

export type DevelopmentSummaryResponse = {
  athleteProfileId: string;
  athleteName: string;
  reportCount: number;
  attendanceCount: number;
  presentCount: number;
  attendanceRate: number | null;
  averages: DevelopmentMetricAverages | null;
  reports: TrainingReportResponse[];
};
