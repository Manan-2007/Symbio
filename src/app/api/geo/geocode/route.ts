import { geocode, isGeoapifyConfigured } from "@/server/geoapify";

export async function GET(request: Request) {
  if (!isGeoapifyConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const text = new URL(request.url).searchParams.get("text")?.trim() ?? "";
  if (text.length < 2 || text.length > 200) return Response.json({ error: "Enter a place of 2–200 characters." }, { status: 400 });
  try {
    return Response.json({ results: await geocode(text) }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json({ error: "geocoding_unavailable" }, { status: 502 });
  }
}
