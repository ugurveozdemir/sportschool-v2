export const endpoints = {
  loginSchools: "/api/auth/schools",
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  meProfile: "/api/me/profile",
  meGroups: "/api/me/groups",
  meTrainings: "/api/me/trainings",
  meAttendance: "/api/me/attendance",
  mePayments: "/api/me/payments",
  meAthleteReports: "/api/me/athlete-reports",
  coachSummary: "/api/mobile/coach/summary",
  coachGroups: "/api/mobile/coach/groups",
  coachTrainings: "/api/mobile/coach/trainings",
  coachAttendanceRoster: (trainingId: string) => `/api/mobile/coach/trainings/${trainingId}/attendance-roster`,
  coachAttendance: (trainingId: string) => `/api/mobile/coach/trainings/${trainingId}/attendance`,
  coachAttendanceItem: (trainingId: string, athleteProfileId: string) => `/api/mobile/coach/trainings/${trainingId}/attendance/${athleteProfileId}`
} as const;
