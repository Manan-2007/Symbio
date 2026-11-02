import { connection } from "next/server";
import { isAzureConfigured } from "@/server/azure-openai";
import { isGeoapifyConfigured } from "@/server/geoapify";

/** Integration status for the in-app status page. Reports configuration only, never key values. */
export async function GET() {
  await connection();
  return Response.json({
    geoapify: { configured: isGeoapifyConfigured(), ok: isGeoapifyConfigured(), detail: isGeoapifyConfigured() ? "Maps, geocoding and routing via /api/geo/*." : "Set GEOAPIFY_API_KEY (server-only)." },
    azureOpenAI: { configured: isAzureConfigured(), ok: isAzureConfigured(), detail: isAzureConfigured() ? `Assistant, classifier and barter estimator via ${process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o"}.` : "Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT (server-only)." },
  }, { headers: { "Cache-Control": "no-store" } });
}
