export type LastResponse = {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  durationMs: number;
  body: unknown;
  requestedAt: string;
};

let currentResponse: LastResponse | null = null;
const listeners = new Set<() => void>();

export function getLastResponse() {
  return currentResponse;
}

export function setLastResponse(response: LastResponse) {
  currentResponse = response;
  listeners.forEach((listener) => listener());
}

export function subscribeToLastResponse(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
