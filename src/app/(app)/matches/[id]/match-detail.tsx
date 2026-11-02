"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Ban, Building2, CheckCircle2, ClipboardList, Package, Send, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, LoadingBlock, Notice } from "@/components/ui/primitives";
import { FactorBar, MaterialArt, ScoreRing } from "@/components/ui/visuals";
import { MapView } from "@/components/map-view";
import { RequestModal } from "@/components/request-modal";
import { CONTAMINATION_LABELS, QUALITY_LABELS, cityName, findMaterial, materialName } from "@/services/catalog";
import { evaluate, isMatch, parseMatchId, WEIGHTS } from "@/services/matchingEngine";
import { estimateCo2eKg } from "@/services/carbonCalculator";
import { OPEN_STATUSES } from "@/services/actions";
import { fmtCo2e, fmtInr, fmtKg, fmtPricePerKg } from "@/utils/format";

export function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, me, isHydrated } = useApp();
  const [requestOpen, setRequestOpen] = useState(false);
  const parsed = parseMatchId(decodeURIComponent(id));
  const listing = parsed && state.listings.find((l) => l.id === parsed.listingId);
  const requirement = parsed && state.requirements.find((r) => r.id === parsed.requirementId);
  const result = useMemo(() => (listing && requirement ? evaluate(listing, requirement) : null), [listing, requirement]);
  const markers = useMemo(() => (listing && requirement ? [
    { id: "s", cityId: listing.cityId, label: "Supplier", tone: "generator" as const },
    { id: "b", cityId: requirement.cityId, label: "Buyer", tone: "consumer" as const },
  ] : []), [listing, requirement]);

  if (!isHydrated) return <LoadingBlock />;
  if (!listing || !requirement || !result) {
    return <EmptyState title="Match not found" action={<ButtonLink href="/matches" variant="secondary">Back to matches</ButtonLink>}>The listing or requirement may have been removed.</EmptyState>;
  }
  const supplier = state.companies.find((c) => c.id === listing.companyId);
  const buyer = state.companies.find((c) => c.id === requirement.companyId);
  const material = findMaterial(listing.materialId)!;

  if (!isMatch(result)) {
    return (
      <div className="space-y-6">
        <Link href="/matches" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-forest"><ArrowLeft className="size-4" /> Matches</Link>
        <EmptyState icon={<Ban className="size-5" />} title="Not a compatible match" action={<ButtonLink href="/matches" variant="secondary">See compatible matches</ButtonLink>}>
          {listing.title} from {supplier?.name} was rejected for {buyer?.name}&apos;s requirement: {result.reason}
        </EmptyState>
      </div>
    );
  }

  const m = result;
  const isBuyer = me?.id === requirement.companyId;
  const isSeller = me?.id === listing.companyId;
  const existing = me && state.deals.find((d) => d.listingId === listing.id && d.buyerId === me.id && OPEN_STATUSES.includes(d.status));
  const suggestedPrice = Math.min(listing.pricePerKg, requirement.maxBudgetPerKg);

  return (
    <div className="space-y-8">
      <Link href="/matches" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-forest"><ArrowLeft className="size-4" /> Matches</Link>

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:p-9">
            <ScoreRing score={m.score} size={120} />
            <div>
              <p className="eyebrow">Match details</p>
              <h1 className="mt-2 font-display text-[36px] leading-[1.05] text-forest-950 sm:text-[42px]">{supplier?.name} <span className="text-muted">→</span> {buyer?.name}</h1>
              <p className="mt-2 text-[14px] text-muted">{materialName(listing.materialId)} · {fmtKg(m.usableKg)} usable · ~{m.distanceKm.toFixed(1)} km straight-line</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {supplier?.isDemo && <Badge tone="gold">Demo companies</Badge>}
                {m.breakdown.material < 1 && <Badge tone="gold">Substitute material</Badge>}
                {m.cautions.map((c) => <Badge key={c} tone="gold" icon={<AlertTriangle className="size-3" />}>{c}</Badge>)}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2 border-t border-line bg-mist p-7 lg:min-w-[280px] lg:border-t-0 lg:border-l">
            {isBuyer ? (
              existing ? (
                <ButtonLink href={`/negotiations?deal=${existing.id}`}>Continue negotiation</ButtonLink>
              ) : (
                <Button icon={<Send className="size-4" />} onClick={() => setRequestOpen(true)}>Request connection</Button>
              )
            ) : isSeller ? (
              <Notice tone="green">This buyer fits your listing. Buyers start purchase requests; you&apos;ll see theirs in Negotiations.</Notice>
            ) : me ? (
              <Notice>You&apos;re viewing a match between two other companies.</Notice>
            ) : (
              <ButtonLink href="/login">Sign in as the buyer to connect</ButtonLink>
            )}
            <p className="text-[12px] text-muted">Suggested opening offer: {fmtKg(m.usableKg)} at {fmtPricePerKg(suggestedPrice)} = {fmtInr(m.usableKg * suggestedPrice)}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-7">
          <h2 className="font-display text-[26px] text-forest-950">Compatibility breakdown</h2>
          <p className="mt-1 text-[13px] text-muted">Score = M×{WEIGHTS.material} + Q×{WEIGHTS.quantity} + D×{WEIGHTS.distance} + P×{WEIGHTS.price}</p>
          <div className="mt-6 space-y-5">
            <FactorBar label="Material compatibility" value={m.breakdown.material} weight={WEIGHTS.material} detail={m.breakdown.material === 1 ? "Exact material code" : `${material.name} accepted as a substitute`} />
            <FactorBar label="Quantity" value={m.breakdown.quantity} weight={WEIGHTS.quantity} detail={`${fmtKg(listing.quantityKg)} available · ${fmtKg(requirement.quantityKg)} required`} />
            <FactorBar label="Proximity" value={m.breakdown.distance} weight={WEIGHTS.distance} detail={`~${m.distanceKm.toFixed(1)} km of a ${requirement.maxDistanceKm} km radius`} />
            <FactorBar label="Price" value={m.breakdown.price} weight={WEIGHTS.price} detail={`${fmtPricePerKg(listing.pricePerKg)} vs budget ${fmtPricePerKg(requirement.maxBudgetPerKg)}`} />
          </div>
          <h3 className="mt-8 text-[13px] font-bold tracking-[0.12em] text-muted uppercase">Why this was recommended</h3>
          <ul className="mt-3 space-y-2">
            {m.reasons.map((r) => <li key={r} className="flex gap-2 text-[14px]"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden />{r}</li>)}
          </ul>
        </Card>
        <div className="space-y-6">
          <MapView markers={markers} route={{ fromCityId: listing.cityId, toCityId: requirement.cityId }} />
          <Card className="p-6">
            <h2 className="font-display text-[22px] text-forest-950">Potential impact</h2>
            <p className="mt-2 text-[14px] text-muted">Reusing {fmtKg(m.usableKg)} would avoid an estimated <strong className="text-forest">{fmtCo2e(estimateCo2eKg(material.id, m.usableKg))}</strong> (illustrative {material.co2eFactor} kgCO₂e/kg). Counted only once the exchange completes.</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em] text-muted uppercase"><Building2 className="size-4" /> Supplier</div>
          <p className="mt-3 flex items-center gap-1.5 text-[17px] font-semibold">{supplier?.name}{supplier?.verified && <ShieldCheck className="size-4 text-emerald" aria-label="Verified" />}</p>
          <p className="text-[13px] text-muted">{supplier?.industry} · {cityName(listing.cityId)}</p>
          <ButtonLink href={`/companies/${listing.companyId}`} size="sm" variant="secondary" className="mt-4">View profile</ButtonLink>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em] text-muted uppercase"><ClipboardList className="size-4" /> Buyer requirement</div>
          <p className="mt-3 text-[17px] font-semibold">{buyer?.name}</p>
          <ul className="mt-2 space-y-1 text-[13px] text-muted">
            <li>{materialName(requirement.materialId)} · {fmtKg(requirement.quantityKg)}</li>
            <li>Budget ≤ {fmtPricePerKg(requirement.maxBudgetPerKg)}</li>
            <li>{QUALITY_LABELS[requirement.minQuality].split(" · ")[0]}+ · contamination ≤ {CONTAMINATION_LABELS[requirement.maxContamination].toLowerCase()}</li>
            <li>{cityName(requirement.cityId)} · within {requirement.maxDistanceKm} km</li>
          </ul>
          <ButtonLink href={`/companies/${requirement.companyId}`} size="sm" variant="secondary" className="mt-4">View profile</ButtonLink>
        </Card>
        <Card className="overflow-hidden">
          <MaterialArt category={material.category} imageUrl={listing.imageDataUrl} alt={listing.title} className="h-28" />
          <div className="p-6">
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em] text-muted uppercase"><Package className="size-4" /> Material</div>
            <Link href={`/marketplace/${listing.id}`} className="mt-2 block text-[17px] font-semibold hover:text-forest hover:underline">{listing.title}</Link>
            <p className="text-[13px] text-muted">Grade {listing.quality} · {listing.moisturePct}% moisture · {CONTAMINATION_LABELS[listing.contamination].toLowerCase()} contamination</p>
          </div>
        </Card>
      </div>

      {isBuyer && !existing && (
        <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} listing={listing} requirementId={requirement.id} defaultKg={m.usableKg} defaultPrice={suggestedPrice} />
      )}
    </div>
  );
}
