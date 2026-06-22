import type { LoginMode } from "@/shared/constants/roles";
import type { Session } from "@/shared/types/session";

export type LoginRequest = {
  email: string;
  password: string;
  mode: LoginMode;
  deviceName?: string | null;
};

export type LoginResponse = Session;
