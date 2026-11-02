import { useEffect, useState } from "react";

type Check = { configured: boolean; ok: boolean; detail: string };
export type IntegrationStatus = { supabase: Check & { tables: Record<string, boolean> }; geoapify: Check; azureOpenAI: Check };

let cache: Promise<IntegrationStatus | null> | null = null;

function load(): Promise<IntegrationStatus | null> {
  cache ??= fetch("/api/status", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<IntegrationStatus>) : null))
    .catch(() => null);
  return cache;
}

/** Which server integrations are configured (never key values). null while loading or if unreachable. */
export function useIntegrationStatus(): IntegrationStatus | null {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((s) => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);
  return status;
}
