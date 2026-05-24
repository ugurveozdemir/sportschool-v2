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
  meAthleteReports: "/api/me/athlete-reports"
} as const;
