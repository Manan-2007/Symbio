import { drivingRoute, isGeoapifyConfigured, parseLatLng } from "@/server/geoapify";

/** GET /api/geo/route?from=lat,lng&to=lat,lng → driving distance, duration and simplified path. */
export async function GET(request: Request) {
  if (!isGeoapifyConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const from = parseLatLng(params.get("from"));
  const to = parseLatLng(params.get("to"));
  if (!from || !to) return Response.json({ error: "Provide from and to as lat,lng." }, { status: 400 });
  try {
    return Response.json(await drivingRoute(from, to), { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json({ error: "routing_unavailable" }, { status: 502 });
  }
}
