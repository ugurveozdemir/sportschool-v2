export const loginModes = [
  "PlatformOwner",
  "SchoolAdmin",
  "Coach",
  "Parent",
  "Athlete"
] as const;

export type LoginMode = (typeof loginModes)[number];
