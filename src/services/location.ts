import type { City } from "./types";

/** Validate persisted/geocoded coordinates before they reach matching or maps. */
export function parseLocation(raw: unknown): City | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const v = raw as Record<string, unknown>;
  if (typeof v.id !== "string" || !v.id.trim() || v.id.length > 100 ||
      typeof v.name !== "string" || !v.name.trim() || v.name.length > 500 ||
      typeof v.state !== "string" || v.state.length > 200 ||
      typeof v.lat !== "number" || !Number.isFinite(v.lat) || Math.abs(v.lat) > 90 ||
      typeof v.lng !== "number" || !Number.isFinite(v.lng) || Math.abs(v.lng) > 180) return undefined;
  return { id: v.id, name: v.name.trim(), state: v.state.trim(), lat: v.lat, lng: v.lng };
}

/** Convert the public geocoding response into a self-contained saved location. */
export function locationFromGeocode(raw: unknown): City | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const v = raw as Record<string, unknown>;
  if (typeof v.lat !== "number" || typeof v.lng !== "number") return undefined;
  return parseLocation({
    id: `geo:${v.lat.toFixed(6)}:${v.lng.toFixed(6)}`,
    name: v.label,
    state: typeof v.state === "string" ? v.state : "",
    lat: v.lat,
    lng: v.lng,
  });
}
