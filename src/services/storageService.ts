import type { AppState } from "./types";
import { validateAppState } from "./validation";
import { DEMO_HASH, DEMO_SALT } from "./demoData";

// Browser-local persistence adapter: all SYMBIO data, including demo credentials, lives here.
// Call only from effects or event handlers, never during render.

export const STORAGE_KEY = "symbio-app-v2";

export type LoadResult =
  | { kind: "empty" }
  | { kind: "loaded"; state: AppState }
  | { kind: "corrupt" }
  | { kind: "unsupported" }
  | { kind: "unavailable" };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadState(): LoadResult {
  const store = storage();
  if (!store) return { kind: "unavailable" };
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { kind: "unavailable" };
  }
  if (raw === null) return { kind: "empty" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "corrupt" };
  }
  if (typeof parsed === "object" && parsed !== null && "schemaVersion" in parsed && parsed.schemaVersion !== 2) return { kind: "unsupported" };
  // Saved data from before credentials existed: give password-less accounts the demo password.
  if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { accounts?: unknown }).accounts)) {
    const p = parsed as { accounts: Record<string, unknown>[] };
    p.accounts = p.accounts.map((a) => (a && a.salt === undefined && a.passwordHash === undefined ? { ...a, salt: DEMO_SALT, passwordHash: DEMO_HASH } : a));
  }
  const state = validateAppState(parsed);
  return state ? { kind: "loaded", state } : { kind: "corrupt" };
}

export function saveState(state: AppState): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Removes only SYMBIO's key; never localStorage.clear(). */
export function clearState(): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

const CONTACT_KEY = "symbio-contact-v1";
export type ContactMessage = { name: string; email: string; company: string; topic: string; message: string };

/** Appends a contact-form message to browser storage (demo build). Returns false if storage fails. */
export function saveContactMessage(input: ContactMessage): boolean {
  const store = storage();
  if (!store) return false;
  try {
    const existing = JSON.parse(store.getItem(CONTACT_KEY) ?? "[]") as unknown;
    const list = Array.isArray(existing) ? existing.slice(-49) : [];
    store.setItem(CONTACT_KEY, JSON.stringify([...list, { ...input, createdAt: new Date().toISOString() }]));
    return true;
  } catch {
    return false;
  }
}
