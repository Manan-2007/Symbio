"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Calendar, Mail, MapPin, Phone, Recycle, Settings, ShieldAlert, ShieldCheck, Star } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, LoadingBlock } from "@/components/ui/primitives";
import { ListingCard } from "@/components/listing-card";
import { VerificationCard } from "@/components/verification-card";
import { cityName, materialName } from "@/services/catalog";
import { impactRecords, impactTotals } from "@/services/carbonCalculator";
import { trustScore } from "@/services/analytics";
import { fmtDate, fmtKg, fmtNumber } from "@/utils/format";

export function CompanyProfile() {
  const { id } = useParams<{ id: string }>();
  const { state, me, isHydrated } = useApp();
  const company = state.companies.find((c) => c.id === id);
  const records = useMemo(() => (company ? impactRecords(state, company.id) : []), [state, company]);

  if (!isHydrated) return <LoadingBlock />;
  if (!company) return <EmptyState title="Company not found" action={<ButtonLink href="/marketplace" variant="secondary">Back to marketplace</ButtonLink>}>It may only exist in another browser.</EmptyState>;

  const isMe = me?.id === company.id;
  const listings = state.listings.filter((l) => l.companyId === company.id && (l.status === "active" || isMe));
  const requirements = state.requirements.filter((r) => r.companyId === company.id && r.status === "open");
  const totals = impactTotals(records);
  const trust = trustScore(state, company.id);
  const avg = company.reviews.length ? company.reviews.reduce((s, r) => s + r.rating, 0) / company.reviews.length : null;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="h-28 bg-[linear-gradient(120deg,#1e4d36_0%,#2f7a52_55%,#a8c98a_100%)]" />
        <div className="flex flex-col gap-6 px-7 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="-mt-10 grid size-20 shrink-0 place-items-center rounded-3xl border-4 border-white bg-sage font-display text-4xl font-semibold text-forest-900 shadow-soft">{company.name.charAt(0)}</div>
            <div className="sm:pt-3">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-[36px] leading-tight text-forest-950">{company.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {company.verified ? <Badge tone="green" icon={<ShieldCheck className="size-3" />}>Verified</Badge> : company.verification?.status === "pending" ? <Badge tone="gold" icon={<ShieldAlert className="size-3" />}>Verification pending</Badge> : <Badge tone="neutral" icon={<ShieldAlert className="size-3" />}>Unverified</Badge>}
                {company.roles.map((r) => <Badge key={r} tone="sage">{r === "generator" ? "Waste Generator" : "Waste Consumer"}</Badge>)}
                {company.isDemo && <Badge tone="gold">Demo company</Badge>}
              </div>
            </div>
          </div>
          {isMe && <ButtonLink href="/onboarding" variant="secondary" icon={<Settings className="size-4" />}>Edit profile</ButtonLink>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          {isMe && <VerificationCard company={company} />}
          <Card className="p-6">
            <h2 className="font-display text-[22px] text-forest-950">Business information</h2>
            <p className="mt-2 text-[14px] text-muted">{company.description || "No description yet."}</p>
            <ul className="mt-5 space-y-2.5 text-[13.5px]">
              <li className="flex items-center gap-2"><Recycle className="size-4 text-muted" aria-hidden />{company.industry}</li>
              <li className="flex items-center gap-2"><MapPin className="size-4 text-muted" aria-hidden />{cityName(company.cityId)}</li>
              <li className="flex items-center gap-2"><Calendar className="size-4 text-muted" aria-hidden />Founded {company.foundedYear}</li>
              {me && <li className="flex items-center gap-2"><Mail className="size-4 text-muted" aria-hidden />{company.email}</li>}
              {me && <li className="flex items-center gap-2"><Phone className="size-4 text-muted" aria-hidden />{company.phone}</li>}
            </ul>
            {!me && <p className="mt-4 text-[12px] text-muted">Sign in to see contact details.</p>}
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[22px] text-forest-950">Trust score</h2>
              <span className="font-display text-[34px] text-forest">{trust}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sage-50"><div className="h-full rounded-full bg-gradient-to-r from-leaf to-emerald" style={{ width: `${trust}%` }} /></div>
            <p className="mt-3 text-[12px] text-muted">Demo heuristic from verification status, review ratings and completed exchanges.</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-mist p-3"><dt className="text-[12px] text-muted">Completed exchanges</dt><dd className="font-display text-[26px] text-forest-950">{totals.exchanges}</dd></div>
              <div className="rounded-2xl bg-mist p-3"><dt className="text-[12px] text-muted">Material reused</dt><dd className="font-display text-[26px] text-forest-950">{fmtKg(totals.reusedKg)}</dd></div>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-4 font-display text-[28px] text-forest-950">Active listings</h2>
            {listings.length ? (
              <div className="grid gap-5 sm:grid-cols-2">{listings.map((l) => <ListingCard key={l.id} listing={l} compact />)}</div>
            ) : <p className="rounded-card border border-dashed border-line-strong p-6 text-center text-[14px] text-muted">No active listings.</p>}
          </section>
          {requirements.length > 0 && (
            <Card className="p-6">
              <h2 className="font-display text-[24px] text-forest-950">Buying</h2>
              <ul className="mt-3 divide-y divide-line text-[14px]">
                {requirements.map((r) => <li key={r.id} className="flex justify-between py-2.5"><span>{materialName(r.materialId)}</span><span className="text-muted">{fmtKg(r.quantityKg)} · within {r.maxDistanceKm} km</span></li>)}
              </ul>
            </Card>
          )}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[24px] text-forest-950">Reviews</h2>
              {avg !== null && <p className="flex items-center gap-1 text-[14px] font-semibold"><Star className="size-4 fill-gold text-gold" aria-hidden />{avg.toFixed(1)} · {company.reviews.length}</p>}
            </div>
            {company.reviews.length ? (
              <ul className="mt-4 space-y-4">
                {company.reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-mist p-4">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold">{r.author}</span>
                      <span className="flex items-center gap-0.5" aria-label={`${r.rating} of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-line-strong"}`} aria-hidden />)}</span>
                    </div>
                    <p className="mt-1.5 text-[14px] text-ink/85">{r.text}</p>
                    <p className="mt-1 text-[12px] text-muted">{fmtDate(r.date)} · demo review</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-[14px] text-muted">No reviews yet.</p>}
          </Card>
          {records.length > 0 && <p className="text-[12px] text-muted">Estimated CO₂e avoided through {company.name}&apos;s completed exchanges: {fmtNumber(totals.co2eKg)} kg (illustrative).</p>}
        </div>
      </div>
    </div>
  );
}
