"use client";

import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { useIntegrationStatus } from "@/hooks/use-integration-status";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/primitives";

type Row = { name: string; what: string; ok: boolean | null; configured: boolean | null; detail: string; next?: string };

function Icon({ ok, configured }: { ok: boolean | null; configured: boolean | null }) {
  if (ok === null) return <Loader2 className="size-5 animate-spin text-muted" aria-label="Checking" />;
  if (ok) return <CheckCircle2 className="size-5 text-emerald" aria-label="Working" />;
  if (configured) return <CircleDashed className="size-5 text-gold" aria-label="Needs setup" />;
  return <XCircle className="size-5 text-error" aria-label="Not configured" />;
}

export default function IntegrationsPage() {
  const status = useIntegrationStatus();
  const rows: Row[] = [
    {
      name: "Azure OpenAI (gpt-4o)", what: "Symbio Assistant answers and photo classification in the Waste classifier.",
      ok: status ? status.azureOpenAI.ok : null, configured: status ? status.azureOpenAI.configured : null, detail: status?.azureOpenAI.detail ?? "Checking…",
    },
    {
      name: "Geoapify", what: "Map tiles, place search, driving routes and road distances.",
      ok: status ? status.geoapify.ok : null, configured: status ? status.geoapify.configured : null, detail: status?.geoapify.detail ?? "Checking…",
    },
    {
      name: "Supabase", what: "Contact form storage now; accounts, shared marketplace data and photo storage next.",
      ok: status ? status.supabase.ok : null, configured: status ? status.supabase.configured : null, detail: status?.supabase.detail ?? "Checking…",
      next: status && status.supabase.configured && !status.supabase.ok ? "Open Supabase → SQL Editor, paste supabase/schema.sql from the repo, and run it once." : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Integrations" title="Connected services" description="Live status of the external services behind SYMBIO. Keys are stored server-side and never shown here." />
      <div className="space-y-4">
        {rows.map((r) => (
          <Card key={r.name} className="flex gap-4 p-6">
            <Icon ok={r.ok} configured={r.configured} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[24px] leading-tight text-forest-950">{r.name}</h2>
                {r.ok !== null && <Badge tone={r.ok ? "green" : r.configured ? "gold" : "red"}>{r.ok ? "Working" : r.configured ? "Needs setup" : "Not configured"}</Badge>}
              </div>
              <p className="mt-1 text-[14px] text-muted">{r.what}</p>
              <p className="mt-2 text-[13px]">{r.detail}</p>
              {r.next && <Notice className="mt-3">{r.next}</Notice>}
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <h2 className="font-display text-[24px] text-forest-950">Prototype features</h2>
        <ul className="mt-3 space-y-2 text-[14px] text-muted">
          <li><strong className="text-ink">Payments:</strong> escrow checkout is simulated. No money moves and no payment details are collected.</li>
          <li><strong className="text-ink">Notifications:</strong> in-app only, derived from activity. Email/SMS delivery needs a backend worker.</li>
          <li><strong className="text-ink">Verification:</strong> GSTIN format is checked and only the document&apos;s file name is kept. Review is simulated.</li>
          <li><strong className="text-ink">Marketplace data:</strong> stored in this browser until the Supabase adapter replaces local storage.</li>
        </ul>
      </Card>
    </div>
  );
}
