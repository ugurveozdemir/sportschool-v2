// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { getStoredSession, storeSession, type AuthSession } from "./sessionStore";

const validSession: AuthSession = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2030-01-01T00:00:00Z",
  userId: "user-id",
  schoolId: "school-id",
  email: "admin@example.com",
  fullName: "School Admin",
  loginRole: "SchoolAdmin",
  roles: ["SchoolAdmin"]
};

describe("sessionStore", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a valid session", () => {
    storeSession(validSession);
    expect(getStoredSession()).toEqual(validSession);
  });

  it("removes malformed or inconsistent sessions", () => {
    localStorage.setItem("sportschool.dashboard.session", JSON.stringify({
      ...validSession,
      loginRole: "PlatformOwner",
      roles: ["SchoolAdmin"]
    }));

    expect(getStoredSession()).toBeNull();
    expect(localStorage.getItem("sportschool.dashboard.session")).toBeNull();
  });
});
