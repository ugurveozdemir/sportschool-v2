export const endpoints = {
  health: "/api/health",
  bootstrapPlatformOwner: "/api/bootstrap/platform-owner",
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  changePassword: "/api/auth/change-password"
} as const;
