import "server-only";

// Geoapify geocoding, routing and static maps. The key never leaves the server.

const API = "https://api.geoapify.com/v1";
const MAPS = "https://maps.geoapify.com/v1";

export type LatLng = { lat: number; lng: number };
export type GeocodeHit = { label: string; lat: number; lng: number; city: string | null; state: string | null };
export type RouteResult = { distanceKm: number; durationMin: number; coords: [number, number][] }; // [lng, lat]

export function isGeoapifyConfigured(): boolean {
  return Boolean(process.env.GEOAPIFY_API_KEY);
}

function key(): string {
  const k = process.env.GEOAPIFY_API_KEY;
  if (!k) throw new Error("not_configured");
  return k;
}

export function parseLatLng(raw: string | null): LatLng | null {
  if (!raw) return null;
  const [lat, lng] = raw.split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export async function geocode(text: string): Promise<GeocodeHit[]> {
  const url = `${API}/geocode/search?text=${encodeURIComponent(text)}&limit=5&format=json&apiKey=${key()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), next: { revalidate: 86_400 } });
  if (!response.ok) throw new Error(`geoapify_${response.status}`);
  const data = (await response.json()) as { results?: { formatted?: string; lat?: number; lon?: number; city?: string; state?: string }[] };
  return (data.results ?? [])
    .filter((r) => typeof r.lat === "number" && typeof r.lon === "number")
    .map((r) => ({ label: r.formatted ?? `${r.lat}, ${r.lon}`, lat: r.lat!, lng: r.lon!, city: r.city ?? null, state: r.state ?? null }));
}

/** Keeps at most `max` evenly spaced points so polylines fit in a static-map URL. */
function simplify(coords: [number, number][], max: number): [number, number][] {
  if (coords.length <= max) return coords;
  const step = (coords.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => coords[Math.round(i * step)]);
}

export async function drivingRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  const url = `${API}/routing?waypoints=${from.lat},${from.lng}|${to.lat},${to.lng}&mode=drive&apiKey=${key()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), next: { revalidate: 86_400 } });
  if (!response.ok) throw new Error(`geoapify_${response.status}`);
  const data = (await response.json()) as { features?: { properties?: { distance?: number; time?: number }; geometry?: { type: string; coordinates: unknown } }[] };
  const feature = data.features?.[0];
  if (!feature?.properties?.distance || !feature.geometry) throw new Error("no_route");
  const geometry = feature.geometry;
  const lines = (geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates]) as [number, number][][];
  return {
    distanceKm: feature.properties.distance / 1000,
    durationMin: (feature.properties.time ?? 0) / 60,
    coords: simplify(lines.flat(), 80),
  };
}

export type StaticMarker = LatLng & { color: string; label?: string };

export function staticMapUrl({ markers, route, width, height }: { markers: StaticMarker[]; route?: [number, number][]; width: number; height: number }): string {
  const params = new URLSearchParams({ style: "osm-bright-smooth", width: String(width), height: String(height), scaleFactor: "2", apiKey: key() });
  if (markers.length) {
    params.set("marker", markers.map((m) => `lonlat:${m.lng.toFixed(5)},${m.lat.toFixed(5)};type:awesome;color:${m.color};size:medium${m.label ? `;text:${m.label.slice(0, 2)}` : ""}`).join("|"));
  }
  if (route?.length) {
    params.set("geometry", `polyline:${route.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(",")};linecolor:#a8834a;linewidth:5;lineopacity:0.9`);
  }
  // With no center/zoom, Geoapify fits the view to the markers and geometry.
  if (markers.length === 1 && !route?.length) {
    params.set("center", `lonlat:${markers[0].lng},${markers[0].lat}`);
    params.set("zoom", "9");
  }
  return `${MAPS}/staticmap?${params.toString()}`;
}
