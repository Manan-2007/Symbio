import { connection } from "next/server";
import { isAzureConfigured } from "@/server/azure-openai";
import { isGeoapifyConfigured } from "@/server/geoapify";

type Check = { configured: boolean; ok: boolean; detail: string };

async function supabaseCheck(): Promise<Check & { tables: Record<string, boolean> }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const tables: Record<string, boolean> = {};
  if (!url || !key) return { configured: false, ok: false, detail: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.", tables };
  try {
    const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    for (const table of ["companies", "listings", "requirements", "deals", "contact_messages"]) {
      const r = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(6000), cache: "no-store" });
      tables[table] = r.ok;
    }
    const missing = Object.entries(tables).filter(([, ok]) => !ok).map(([t]) => t);
    return {
      configured: true,
      ok: health.ok && missing.length === 0,
      detail: !health.ok ? "Project unreachable." : missing.length ? `Connected. Missing tables: ${missing.join(", ")}. Run supabase/schema.sql.` : "Connected; schema present.",
      tables,
    };
  } catch {
    return { configured: true, ok: false, detail: "Could not reach Supabase.", tables };
  }
}

/** Integration status for the in-app status page. Reports configuration only, never key values. */
export async function GET() {
  await connection();
  return Response.json({
    supabase: await supabaseCheck(),
    geoapify: { configured: isGeoapifyConfigured(), ok: isGeoapifyConfigured(), detail: isGeoapifyConfigured() ? "Maps, geocoding and routing via /api/geo/*." : "Set GEOAPIFY_API_KEY (server-only)." },
    azureOpenAI: { configured: isAzureConfigured(), ok: isAzureConfigured(), detail: isAzureConfigured() ? `Assistant and classifier via ${process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o"}.` : "Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT (server-only)." },
  }, { headers: { "Cache-Control": "no-store" } });
}
