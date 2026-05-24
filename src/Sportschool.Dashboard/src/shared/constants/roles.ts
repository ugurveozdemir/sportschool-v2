export const loginModes = [
  "PlatformOwner",
  "SchoolAdmin",
  "Coach",
  "Parent",
  "Athlete"
] as const;

export type LoginMode = (typeof loginModes)[number];

export const staffLoginModes = ["SchoolAdmin", "Coach"] as const;
export type StaffLoginMode = (typeof staffLoginModes)[number];
