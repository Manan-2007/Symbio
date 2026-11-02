import { useSyncExternalStore } from "react";

let cached: string | null = null;
const subscribe = () => () => {};
const getClientNow = () => (cached ??= new Date().toISOString());
const getServerNow = () => null;

/**
 * Current time as an ISO string on the client, null during server prerendering.
 * Fixed for the page session so charts don't shift between renders.
 */
export function useClientNow(): string | null {
  return useSyncExternalStore(subscribe, getClientNow, getServerNow);
}
