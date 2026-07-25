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
    `/api/platform/schools/${schoolId}/admins/${adminId}/password`,
  schoolAthletes: "/api/school/athletes",
  schoolAthleteProfileImage: (athleteProfileId: string) =>
    `/api/school/athletes/${athleteProfileId}/profile-image`,
  schoolAthleteVideos: (athleteProfileId: string) =>
    `/api/school/athletes/${athleteProfileId}/videos`,
  schoolVideos: "/api/school/athlete-videos",
  schoolVideoPublication: (videoId: string) =>
    `/api/school/athlete-videos/${videoId}/publication`,
  schoolVideo: (videoId: string) => `/api/school/athlete-videos/${videoId}`
} as const;
