// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, getSession, setSession, type AuthSession } from "./sessionStore";

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
  beforeEach(() => clearSession());

  it("keeps a valid session in memory without using browser storage", () => {
    setSession(validSession);

    expect(getSession()).toEqual(validSession);
    expect(localStorage.getItem("sportschool.dashboard.session")).toBeNull();
  });

  it("removes a legacy stored session", () => {
    localStorage.setItem("sportschool.dashboard.session", JSON.stringify({
      ...validSession
    }));

    expect(getSession()).toBeNull();
    expect(localStorage.getItem("sportschool.dashboard.session")).toBeNull();
  });
});
