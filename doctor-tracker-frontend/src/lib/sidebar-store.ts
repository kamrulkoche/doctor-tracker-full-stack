/**
 * Persisted sidebar preference as a tiny external store (read with useSyncExternalStore).
 * `null` means "no preference yet": the layout then follows the breakpoint default
 * (expanded on desktop, icon rail on tablet).
 */
const STORAGE_KEY = "dt:sidebar";

export type SidebarPreference = "expanded" | "collapsed" | null;

const listeners = new Set<() => void>();

export function getSidebarPreference(): SidebarPreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "expanded" || value === "collapsed" ? value : null;
  } catch {
    return null;
  }
}

export function setSidebarPreference(open: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "expanded" : "collapsed");
  } catch {
    // Storage can be unavailable (private mode); the toggle then lasts for the session only.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSidebarPreference(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
