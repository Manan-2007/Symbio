"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Ban, ClipboardList, PlusCircle, Sparkles } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { RequireAuth } from "@/components/layout/require-auth";
import { MatchCard } from "@/components/match-card";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/field";
import { FactorBar, ScoreRing } from "@/components/ui/visuals";
import { cityName, findMaterial, materialName } from "@/services/catalog";
import { evaluate, isMatch, matchesForListing, matchesForRequirement, WEIGHTS } from "@/services/matchingEngine";
import type { Rejection } from "@/services/matchingEngine";
import { cx, fmtKg, fmtPricePerKg } from "@/utils/format";

function Matches() {
  const params = useSearchParams();
  const { state, me } = useApp();
  const company = me!;
  const myRequirements = state.requirements.filter((r) => r.companyId === company.id && r.status === "open");
  const myListings = state.listings.filter((l) => l.companyId === company.id && l.status === "active");
  const reqParam = params.get("req");
  const [mode, setMode] = useState<"buy" | "sell">(myRequirements.length || !myListings.length ? "buy" : "sell");
  const [requirementId, setRequirementId] = useState(myRequirements.find((r) => r.id === reqParam)?.id ?? myRequirements[0]?.id ?? "");
  const [listingId, setListingId] = useState(myListings[0]?.id ?? "");

  const requirement = myRequirements.find((r) => r.id === requirementId) ?? myRequirements[0];
  const listing = myListings.find((l) => l.id === listingId) ?? myListings[0];

  const matches = mode === "buy"
    ? (requirement ? matchesForRequirement(requirement, state.listings) : [])
    : (listing ? matchesForListing(listing, state.requirements) : []);

  // Transparency: same-category candidates the engine rejected, with the reason.
  const category = requirement && findMaterial(requirement.materialId)?.category;
  const rejected = mode === "buy" && requirement
    ? state.listings
      .filter((l) => l.status === "active" && l.companyId !== company.id && findMaterial(l.materialId)?.category === category)
      .map((l) => evaluate(l, requirement))
      .filter((r): r is Rejection => !isMatch(r))
    : [];

  const top = matches[0];
  const rest = matches.slice(1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Smart matchmaking"
        title={<>Your best <em className="italic text-emerald">opportunities</em>, ranked</>}
        description="Score = Material × 40% + Quantity × 25% + Proximity × 25% + Price × 10%. Incompatible material, quality, contamination, moisture or distance is rejected before scoring."
      />

      <div className="inline-flex rounded-full border border-line bg-white p-1 shadow-soft" role="tablist" aria-label="Match direction">
        {([["buy", "Supply for my requirements"], ["sell", "Buyers for my listings"]] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)} className={cx("focus-ring rounded-full px-4 py-2 text-[13px] font-semibold transition-colors", mode === value ? "bg-forest text-white" : "text-muted hover:text-forest")}>
            {label}
          </button>
        ))}
      </div>

      {mode === "buy" && !requirement && (
        <EmptyState icon={<ClipboardList className="size-5" />} title="No open requirements" action={<ButtonLink href="/requirements" icon={<PlusCircle className="size-4" />}>Publish a requirement</ButtonLink>}>
          Publish what material you need and suppliers will be ranked here.
        </EmptyState>
      )}
      {mode === "sell" && !listing && (
        <EmptyState icon={<Sparkles className="size-5" />} title="No active listings" action={<ButtonLink href="/listings/new" icon={<PlusCircle className="size-4" />}>Add a listing</ButtonLink>}>
          List a by-product to see which buyers fit it best.
        </EmptyState>
      )}

      {((mode === "buy" && requirement) || (mode === "sell" && listing)) && (
        <>
          <div className="max-w-md">
            {mode === "buy" ? (
              <SelectField label="Requirement" value={requirement!.id} onChange={(e) => setRequirementId(e.target.value)}>
                {myRequirements.map((r) => <option key={r.id} value={r.id}>{materialName(r.materialId)} · {fmtKg(r.quantityKg)} · ≤ {fmtPricePerKg(r.maxBudgetPerKg)}</option>)}
              </SelectField>
            ) : (
              <SelectField label="Listing" value={listing!.id} onChange={(e) => setListingId(e.target.value)}>
                {myListings.map((l) => <option key={l.id} value={l.id}>{l.title} · {fmtKg(l.quantityKg)}</option>)}
              </SelectField>
            )}
          </div>

          {top ? (
            <Card className="overflow-hidden">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col gap-5 bg-forest p-7 text-white sm:p-9">
                  <p className="eyebrow text-sage">Top match</p>
                  <div className="flex items-center gap-5">
                    <div className="rounded-full bg-white p-1.5"><ScoreRing score={top.score} size={96} /></div>
                    <div>
                      <p className="font-display text-[30px] leading-tight">{state.companies.find((c) => c.id === (mode === "buy" ? top.listing.companyId : top.requirement.companyId))?.name}</p>
                      <p className="text-[14px] text-sage/90">{mode === "buy" ? `${materialName(top.listing.materialId)} · ${fmtKg(top.listing.quantityKg)} · ${fmtPricePerKg(top.listing.pricePerKg)}` : `Needs ${fmtKg(top.requirement.quantityKg)} · budget ${fmtPricePerKg(top.requirement.maxBudgetPerKg)}`}</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-[13.5px] text-sage/95">
                    {top.reasons.slice(0, 4).map((r) => <li key={r} className="flex gap-2"><span aria-hidden>✓</span>{r}</li>)}
                  </ul>
                  <ButtonLink href={`/matches/${top.id}`} variant="light" className="mt-auto self-start" iconRight={<ArrowRight className="size-4" />}>View match & request connection</ButtonLink>
                </div>
                <div className="flex flex-col justify-center gap-5 p-7 sm:p-9">
                  <h2 className="font-display text-[24px] text-forest-950">Compatibility breakdown</h2>
                  <FactorBar label="Material" value={top.breakdown.material} weight={WEIGHTS.material} />
                  <FactorBar label="Quantity" value={top.breakdown.quantity} weight={WEIGHTS.quantity} detail={`${fmtKg(top.usableKg)} usable of ${fmtKg(top.requirement.quantityKg)} needed`} />
                  <FactorBar label="Proximity" value={top.breakdown.distance} weight={WEIGHTS.distance} detail={`~${top.distanceKm.toFixed(1)} km straight-line, ${cityName(top.listing.cityId)} → ${cityName(top.requirement.cityId)}`} />
                  <FactorBar label="Price" value={top.breakdown.price} weight={WEIGHTS.price} />
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState icon={<Sparkles className="size-5" />} title="No compatible matches yet">
              Nothing passes the material, quality and distance gates right now. Try a wider radius, or check back as new listings arrive.
            </EmptyState>
          )}

          {rest.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-[26px] text-forest-950">More matches</h2>
              <div className="grid gap-3 lg:grid-cols-2">{rest.map((m) => <MatchCard key={m.id} match={m} perspective={mode === "buy" ? "buyer" : "seller"} />)}</div>
            </section>
          )}

          {rejected.length > 0 && (
            <details className="group rounded-card border border-line bg-white p-5">
              <summary className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold">
                <Ban className="size-4 text-muted" aria-hidden /> {rejected.length} similar listing{rejected.length === 1 ? " was" : "s were"} filtered out. See why.
              </summary>
              <ul className="mt-4 divide-y divide-line">
                {rejected.map((r) => {
                  const l = state.listings.find((x) => x.id === r.listingId)!;
                  return (
                    <li key={r.listingId} className="flex flex-wrap justify-between gap-2 py-3 text-[13px]">
                      <span><span className="font-semibold">{l.title}</span> <span className="text-muted">· {state.companies.find((c) => c.id === l.companyId)?.name}</span></span>
                      <span className="text-error">{r.reason}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

export function MatchesView() {
  return <RequireAuth title="Sign in to see your matches"><Matches /></RequireAuth>;
}
