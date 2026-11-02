import { drivingRoute, isGeoapifyConfigured, parseLatLng, staticMapUrl } from "@/server/geoapify";
import type { StaticMarker } from "@/server/geoapify";

const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * GET /api/geo/staticmap?m=lat,lng,#hex|...&from=lat,lng&to=lat,lng&w=800&h=560
 * Proxies a Geoapify static map so the API key stays server-side. `from`/`to` draw the driving route.
 */
export async function GET(request: Request) {
  if (!isGeoapifyConfigured()) return new Response("Maps not configured", { status: 503 });
  const params = new URL(request.url).searchParams;
  const width = Math.min(1200, Math.max(200, Number(params.get("w")) || 800));
  const height = Math.min(900, Math.max(150, Number(params.get("h")) || 560));
  const markers: StaticMarker[] = (params.get("m") ?? "").split("|").filter(Boolean).slice(0, 40).flatMap((part) => {
    const [lat, lng, color] = part.split(",");
    const point = parseLatLng(`${lat},${lng}`);
    return point ? [{ ...point, color: color && COLOR.test(color) ? color : "#1e4d36" }] : [];
  });
  const from = parseLatLng(params.get("from"));
  const to = parseLatLng(params.get("to"));

  try {
    let route: [number, number][] | undefined;
    if (from && to) {
      try {
        route = (await drivingRoute(from, to)).coords;
      } catch {
        route = [[from.lng, from.lat], [to.lng, to.lat]]; // straight line if routing fails
      }
    }
    const image = await fetch(staticMapUrl({ markers, route, width, height }), { signal: AbortSignal.timeout(12_000), next: { revalidate: 86_400 } });
    if (!image.ok) return new Response("Map unavailable", { status: 502 });
    return new Response(image.body, {
      headers: { "Content-Type": image.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new Response("Map unavailable", { status: 502 });
  }
}
