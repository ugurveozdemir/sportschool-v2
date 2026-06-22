export const endpoints = {
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  platformSchools: "/api/platform/schools",
  platformSchool: (schoolId: string) => `/api/platform/schools/${schoolId}`,
  platformSchoolAdmins: (schoolId: string) => `/api/platform/schools/${schoolId}/admins`,
  platformSchoolAdmin: (schoolId: string, adminId: string) =>
    `/api/platform/schools/${schoolId}/admins/${adminId}`,
  platformSchoolAdminPassword: (schoolId: string, adminId: string) =>
    `/api/platform/schools/${schoolId}/admins/${adminId}/password`
} as const;
