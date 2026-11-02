"use client";

import { useMemo, useState } from "react";
import { Leaf, Recycle, Scale, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useClientNow } from "@/hooks/use-client-now";
import { ChartCard, Donut, MonthlyBars, TrendArea } from "@/components/charts";
import { Card, EmptyState, LoadingBlock, Notice, PageHeader } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/visuals";
import { CATEGORY_LABELS, MATERIALS } from "@/services/catalog";
import { CARBON_DISCLAIMER, impactRecords, impactTotals } from "@/services/carbonCalculator";
import { categorySeries, monthlySeries } from "@/services/analytics";
import { cx, fmtNumber } from "@/utils/format";

export default function ImpactPage() {
  const { state, me, isHydrated } = useApp();
  const [scope, setScope] = useState<"platform" | "mine">("platform");
  const companyId = scope === "mine" && me ? me.id : undefined;
  const now = useClientNow();
  const records = useMemo(() => impactRecords(state, companyId), [state, companyId]);
  const totals = impactTotals(records);
  const monthly = useMemo(() => (now ? monthlySeries(records, now) : []), [records, now]);
  const categories = useMemo(() => categorySeries(records), [records]);
  const leaderboard = useMemo(() => {
    if (companyId) return [];
    const all = impactRecords(state);
    return state.companies
      .map((c) => {
        const mine = all.filter((r) => r.deal.buyerId === c.id || r.deal.sellerId === c.id);
        return { company: c, ...impactTotals(mine) };
      })
      .filter((r) => r.exchanges > 0)
      .sort((a, b) => b.co2eKg - a.co2eKg)
      .slice(0, 6);
  }, [state, companyId]);

  if (!isHydrated || !now) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Carbon impact"
        title={<>Material kept in use, <em className="italic text-emerald">measured honestly</em></>}
        description="Only completed exchanges count. Requests, negotiations and shipments in transit contribute zero."
        actions={me ? (
          <div className="inline-flex rounded-full border border-line bg-white p-1" role="group" aria-label="Impact scope">
            {([["platform", "All companies"], ["mine", me.name]] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={scope === v} onClick={() => setScope(v)} className={cx("focus-ring max-w-[200px] truncate rounded-full px-4 py-2 text-[13px] font-semibold", scope === v ? "bg-forest text-white" : "text-muted")}>{label}</button>
            ))}
          </div>
        ) : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total waste reused" value={totals.reusedKg} format={(n) => `${fmtNumber(n)} kg`} icon={<Recycle className="size-[18px]" />} />
        <StatCard accent label="Estimated CO₂e avoided" value={totals.co2eKg} format={(n) => `${fmtNumber(n)} kg`} icon={<Leaf className="size-[18px]" />} hint="Illustrative, not certified" />
        <StatCard label="Landfill waste diverted" value={totals.reusedKg / 1000} format={(n) => `${fmtNumber(n, 2)} t`} icon={<Trash2 className="size-[18px]" />} hint="Equal to reused mass" />
        <StatCard label="Total exchanges" value={totals.exchanges} icon={<Scale className="size-[18px]" />} hint="Completed and confirmed" />
      </div>

      {records.length === 0 ? (
        <EmptyState icon={<Leaf className="size-5" />} title="No completed exchanges yet">Impact appears once a buyer confirms receipt of an exchange.</EmptyState>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Monthly impact" subtitle="Estimated kgCO₂e avoided per month">
              <TrendArea data={monthly} dataKey="co2e" unit="kgCO₂e" />
            </ChartCard>
            <ChartCard title="Material reused" subtitle="Kilograms per month">
              <MonthlyBars data={monthly} />
            </ChartCard>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <ChartCard title="By material category" subtitle="Share of reused kilograms">
              <Donut data={categories.map((c) => ({ label: c.label, value: c.kg }))} />
            </ChartCard>
            {leaderboard.length > 0 ? (
              <ChartCard title="Company environmental statistics" subtitle="Each exchange counts once per participating company">
                <table className="w-full text-left text-[13.5px]">
                  <thead><tr className="border-b border-line text-[12px] text-muted"><th className="pb-2 font-semibold">Company</th><th className="pb-2 text-right font-semibold">Exchanges</th><th className="pb-2 text-right font-semibold">Reused</th><th className="pb-2 text-right font-semibold">CO₂e</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {leaderboard.map((r) => (
                      <tr key={r.company.id}>
                        <td className="py-2.5 font-medium">{r.company.name}</td>
                        <td className="py-2.5 text-right tabular-nums">{r.exchanges}</td>
                        <td className="py-2.5 text-right tabular-nums">{fmtNumber(r.reusedKg)} kg</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-forest">{fmtNumber(r.co2eKg)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ChartCard>
            ) : (
              <ChartCard title="Your exchanges" subtitle="Completed exchanges in scope">
                <ul className="divide-y divide-line text-[13.5px]">
                  {records.slice(0, 8).map((r) => (
                    <li key={r.deal.id} className="flex justify-between py-2.5"><span>{CATEGORY_LABELS[r.category]}</span><span className="tabular-nums">{fmtNumber(r.kg)} kg · <strong className="text-forest">{fmtNumber(r.co2eKg)} kgCO₂e</strong></span></li>
                  ))}
                </ul>
              </ChartCard>
            )}
          </div>
        </>
      )}

      <Card className="p-7">
        <h2 className="font-display text-[26px] text-forest-950">Methodology</h2>
        <p className="mt-2 text-[14px] text-muted">Estimated avoided CO₂e = reused quantity × material-specific emission avoidance factor.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead><tr className="border-b border-line text-[12px] text-muted"><th className="pb-2 font-semibold">Material</th><th className="pb-2 font-semibold">Category</th><th className="pb-2 text-right font-semibold">Illustrative factor (kgCO₂e/kg)</th></tr></thead>
            <tbody className="divide-y divide-line">
              {MATERIALS.map((m) => (
                <tr key={m.id}><td className="py-2">{m.name}</td><td className="py-2 text-muted">{CATEGORY_LABELS[m.category]}</td><td className="py-2 text-right tabular-nums">{m.co2eFactor}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Notice className="mt-5">{CARBON_DISCLAIMER} Real reporting needs confirmed transfers, reviewed material- and pathway-specific factors, transport and processing emissions, and a documented baseline.</Notice>
      </Card>
    </div>
  );
}
