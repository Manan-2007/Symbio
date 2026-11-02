import type { City } from "./types";

const EARTH_RADIUS_KM = 6371;

/** Great-circle (straight-line) distance in km. Not a road route. */
export function haversineKm(a: Pick<City, "lat" | "lng">, b: Pick<City, "lat" | "lng">): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
