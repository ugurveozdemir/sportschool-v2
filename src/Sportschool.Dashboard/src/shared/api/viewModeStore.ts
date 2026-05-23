const storageKey = "sportschool.dashboard.devMode";

let devMode: boolean = localStorage.getItem(storageKey) === "true";

export function getDevMode(): boolean {
  return devMode;
}

export function setDevMode(value: boolean) {
  devMode = value;
  localStorage.setItem(storageKey, String(value));
  window.dispatchEvent(new Event("sportschool-devmode-change"));
}

export function subscribeToDevMode(listener: () => void) {
  const handler = () => listener();
  window.addEventListener("sportschool-devmode-change", handler);
  return () => window.removeEventListener("sportschool-devmode-change", handler);
}
