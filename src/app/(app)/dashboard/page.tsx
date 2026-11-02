"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Boxes, ClipboardList, Handshake, Leaf, PlusCircle, Recycle, ScanSearch, Sparkles } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useClientNow } from "@/hooks/use-client-now";
import { RequireAuth } from "@/components/layout/require-auth";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { StatCard } from "@/components/ui/visuals";
import { ChartCard, Donut, MonthlyBars } from "@/components/charts";
import { MatchCard } from "@/components/match-card";
import { categorySeries, dashboardStats, listingCategoryBreakdown, monthlySeries, recentActivity } from "@/services/analytics";
import { matchesForCompany } from "@/services/matchingEngine";
import { CARBON_DISCLAIMER } from "@/services/carbonCalculator";
import { fmtDateTime, fmtNumber } from "@/utils/format";

function Dashboard() {
  const { state, me } = useApp();
  const company = me!;
  const now = useClientNow() ?? "2026-01-01T00:00:00.000Z";
  const stats = useMemo(() => dashboardStats(state, company.id), [state, company.id]);
  const recommended = useMemo(() => matchesForCompany(company.id, state.listings, state.requirements).slice(0, 4), [state, company.id]);
  const monthly = useMemo(() => monthlySeries(stats.records, now), [stats.records, now]);
  const activity = useMemo(() => recentActivity(state, company.id), [state, company.id]);
  const breakdown = useMemo(() => {
    const listed = listingCategoryBreakdown(state, company.id);
    return listed.length ? { title: "Your listed waste by category", rows: listed.map((r) => ({ label: r.label, value: r.kg })) }
      : { title: "Exchanged material by category", rows: categorySeries(stats.records).map((r) => ({ label: r.label, value: r.kg })) };
  }, [state, company.id, stats.records]);
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${company.industry} · ${company.roles.map((r) => (r === "generator" ? "Generator" : "Consumer")).join(" & ")}`}
        title={<>{greeting}, <em className="italic text-emerald">{company.name}</em></>}
        description="Here's what's moving across your by-product exchanges."
        actions={
          <>
            {company.roles.includes("generator") && <ButtonLink href="/listings/new" icon={<PlusCircle className="size-4" />}>Add listing</ButtonLink>}
            {company.roles.includes("consumer") && <ButtonLink href="/requirements" variant="secondary" icon={<ClipboardList className="size-4" />}>New requirement</ButtonLink>}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total waste listed" value={stats.totalListedKg} format={(n) => `${fmtNumber(n)} kg`} icon={<Boxes className="size-[18px]" />} hint="Active listings" />
        <StatCard label="Active matches" value={stats.activeMatches} icon={<Sparkles className="size-[18px]" />} hint={`${stats.openDeals} open exchange${stats.openDeals === 1 ? "" : "s"}`} />
        <StatCard label="Completed exchanges" value={stats.completedExchanges} icon={<Recycle className="size-[18px]" />} hint={`${fmtNumber(stats.reusedKg)} kg reused`} />
        <StatCard accent label="Estimated CO₂e avoided" value={stats.co2eKg} format={(n) => `${fmtNumber(n)} kg`} icon={<Leaf className="size-[18px]" />} hint="Illustrative factors, not certified" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Monthly exchanges" subtitle="Kilograms reused through completed exchanges, last 6 months">
          {stats.records.length ? <MonthlyBars data={monthly} /> : <EmptyState icon={<Recycle className="size-5" />} title="No completed exchanges yet">Completed exchanges will chart here month by month.</EmptyState>}
        </ChartCard>
        <ChartCard title={breakdown.title.split(" by ")[0]} subtitle={`By category · ${breakdown.title.includes("listed") ? "active listings" : "completed exchanges"}`}>
          {breakdown.rows.length ? <Donut data={breakdown.rows} /> : <EmptyState title="Nothing to break down yet">List a by-product or complete an exchange.</EmptyState>}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Recommended matches" subtitle="Highest-scoring opportunities involving your listings or requirements" action={<ButtonLink href="/matches" size="sm" variant="ghost" iconRight={<ArrowRight className="size-3.5" />}>All matches</ButtonLink>}>
          {recommended.length ? (
            <div className="space-y-3">
              {recommended.map((m) => <MatchCard key={m.id} match={m} perspective={m.requirement.companyId === company.id ? "buyer" : "seller"} />)}
            </div>
          ) : (
            <EmptyState icon={<Sparkles className="size-5" />} title="No matches yet" action={<ButtonLink href={company.roles.includes("generator") ? "/listings/new" : "/requirements"} size="sm">{company.roles.includes("generator") ? "Add a listing" : "Publish a requirement"}</ButtonLink>}>
              Publish what you have or what you need and the engine will rank counterparties.
            </EmptyState>
          )}
        </ChartCard>
        <ChartCard title="Recent activity" subtitle="Requests, offers and shipments">
          {activity.length ? (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {activity.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-white bg-leaf ring-1 ring-sage" aria-hidden />
                  <Link href={`/negotiations?deal=${a.dealId}`} className="text-[13.5px] text-ink hover:text-forest hover:underline">{a.text}</Link>
                  <p className="text-[12px] text-muted">{fmtDateTime(a.at)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={<Handshake className="size-5" />} title="Quiet so far">Send or receive a purchase request to see activity.</EmptyState>
          )}
        </ChartCard>
      </div>

      <Card className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/marketplace", icon: Boxes, label: "Browse marketplace" },
          { href: "/matches", icon: Sparkles, label: "Review smart matches" },
          { href: "/negotiations", icon: Handshake, label: "Open negotiations" },
          { href: "/classifier", icon: ScanSearch, label: "Classify a material" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="focus-ring flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-sage-50">
            <span className="grid size-10 place-items-center rounded-full bg-sage-50 text-forest"><q.icon className="size-[18px]" /></span>
            <span className="text-[14px] font-semibold">{q.label}</span>
          </Link>
        ))}
      </Card>
      <p className="text-[12px] text-muted">{CARBON_DISCLAIMER}</p>
    </div>
  );
}

export default function DashboardPage() {
  return <RequireAuth><Dashboard /></RequireAuth>;
}
