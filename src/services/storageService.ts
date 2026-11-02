import type { AppState } from "./types";
import { validateAppState } from "./validation";

// Browser-local persistence adapter. Swap for a Supabase-backed adapter later (see supabase.ts).
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
