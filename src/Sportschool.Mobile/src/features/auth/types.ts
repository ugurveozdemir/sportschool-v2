import type { LoginMode } from "@/shared/constants/roles";
import type { Session } from "@/shared/types/session";

export type LoginSchoolResponse = {
  name: string;
  code: string;
};

export type LoginRequest = {
  schoolCode?: string | null;
  email: string;
  password: string;
  mode: LoginMode;
  deviceName?: string | null;
};

export type LoginResponse = Session;
