import type { DemoState } from "./types";
import { isRecord, validateDemoState } from "./validation";

// Browser-only. Call these from effects or event handlers, never during render.

export const STORAGE_KEY = "symbio-demo-v1";

export type LoadResult =
  | { kind: "empty" } // nothing saved yet: caller initializes seed data
  | { kind: "loaded"; state: DemoState }
  | { kind: "corrupt" } // unreadable JSON or invalid records
  | { kind: "unsupported"; schemaVersion: unknown } // valid JSON from another schema version
  | { kind: "unavailable" }; // storage disabled, blocked or throwing

function getStorage(): Storage | null {
  try {
    // Accessing the property itself can throw (e.g. blocked site data).
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadState(): LoadResult {
  const storage = getStorage();
  if (!storage) return { kind: "unavailable" };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
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
  if (isRecord(parsed) && "schemaVersion" in parsed && parsed.schemaVersion !== 1) {
    return { kind: "unsupported", schemaVersion: parsed.schemaVersion };
  }
  const state = validateDemoState(parsed);
  return state ? { kind: "loaded", state } : { kind: "corrupt" };
}

/** Returns false when the write fails (quota, private mode, blocked storage). */
export function saveState(state: DemoState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Removes only Symbio's key. Never calls localStorage.clear(). */
export function clearState(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
