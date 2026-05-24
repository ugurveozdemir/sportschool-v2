import * as SecureStore from "expo-secure-store";

import type { Session } from "@/shared/types/session";

const sessionKey = "sportschool.session";

export async function getStoredSession() {
  const raw = await SecureStore.getItemAsync(sessionKey);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function setStoredSession(session: Session) {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(sessionKey);
}
