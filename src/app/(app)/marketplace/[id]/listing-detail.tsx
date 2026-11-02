"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, Droplets, FlaskConical, Heart, MapPin, Package, Send, ShieldCheck, Star } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, LoadingBlock, Notice } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/modal";
import { MaterialArt } from "@/components/ui/visuals";
import { MatchCard } from "@/components/match-card";
import { ListingCard } from "@/components/listing-card";
import { RequestModal } from "@/components/request-modal";
import { CATEGORY_LABELS, CONTAMINATION_LABELS, QUALITY_LABELS, cityName, findMaterial } from "@/services/catalog";
import { matchesForListing } from "@/services/matchingEngine";
import { estimateCo2eKg } from "@/services/carbonCalculator";
import { materialGuidance } from "@/services/ai";
import { fmtCo2e, fmtDate, fmtKg, fmtNumber, fmtPricePerKg } from "@/utils/format";

const AVAILABILITY_LABELS = { immediate: "Available now", weekly: "Weekly supply", monthly: "Monthly supply", one_time: "One-time lot" } as const;

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, me, isHydrated, toggleSaved, setListingStatus } = useApp();
  const { toast } = useToast();
  const [requestOpen, setRequestOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const listing = state.listings.find((l) => l.id === id);
  const buyers = useMemo(() => (listing ? matchesForListing(listing, state.requirements) : []), [listing, state.requirements]);

  if (!isHydrated) return <LoadingBlock />;
  if (!listing) {
    return <EmptyState title="Listing not found" action={<ButtonLink href="/marketplace" variant="secondary">Back to marketplace</ButtonLink>}>It may have been removed, or it was created in another browser.</EmptyState>;
  }
  const material = findMaterial(listing.materialId)!;
  const company = state.companies.find((c) => c.id === listing.companyId);
  const isOwner = me?.id === listing.companyId;
  const saved = me ? (state.savedListingIds[me.id] ?? []).includes(listing.id) : false;
  const guidance = materialGuidance(material);
  const avgRating = company?.reviews.length ? company.reviews.reduce((s, r) => s + r.rating, 0) / company.reviews.length : null;
  const similar = state.listings.filter((l) => l.id !== listing.id && l.status === "active" && findMaterial(l.materialId)?.category === material.category).slice(0, 3);
  const openDeal = me && state.deals.find((d) => d.listingId === listing.id && d.buyerId === me.id && ["requested", "negotiating", "accepted", "in_transit"].includes(d.status));

  return (
    <div className="space-y-8">
      <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-forest"><ArrowLeft className="size-4" /> Marketplace</Link>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-panel border border-line">
            <MaterialArt category={material.category} imageUrl={listing.imageDataUrl} alt={listing.title} className="h-72 sm:h-96" />
          </div>
          <Card className="p-7">
            <h2 className="font-display text-[26px] text-forest-950">About this material</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{listing.description || "No description provided."}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, label: "Quality", value: QUALITY_LABELS[listing.quality] },
                { icon: FlaskConical, label: "Contamination", value: CONTAMINATION_LABELS[listing.contamination] },
                { icon: Droplets, label: "Moisture", value: `${listing.moisturePct}%` },
                { icon: Calendar, label: "Availability", value: AVAILABILITY_LABELS[listing.availability] },
                { icon: Package, label: "Listed as", value: `${fmtNumber(listing.quantity, 3)} ${listing.unit}${listing.unit === "tonne" ? "s" : ""}` },
                { icon: MapPin, label: "Location", value: cityName(listing.cityId) },
              ].map((row) => (
                <div key={row.label} className="flex gap-3 rounded-2xl bg-mist p-4">
                  <row.icon className="mt-0.5 size-[18px] shrink-0 text-forest" aria-hidden />
                  <div><dt className="text-[12px] text-muted">{row.label}</dt><dd className="text-[14px] font-semibold">{row.value}</dd></div>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12px] text-muted">Quality, moisture and contamination are supplier declarations, not independently verified.</p>
          </Card>
          <Card className="p-7">
            <h2 className="font-display text-[26px] text-forest-950">Reuse routes</h2>
            <div className="mt-4 flex flex-wrap gap-2">{guidance.reuses.map((r) => <Badge key={r} tone="green">{r}</Badge>)}</div>
            <p className="mt-4 text-[13px] text-muted">Typical buyers: {guidance.industries.join(", ")}.</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-7 lg:sticky lg:top-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{CATEGORY_LABELS[material.category]}</Badge>
              {listing.status === "closed" && <Badge tone="red">Closed</Badge>}
              {company?.isDemo && <Badge tone="gold">Demo listing</Badge>}
            </div>
            <h1 className="mt-4 font-display text-[38px] leading-[1.05] text-forest-950">{listing.title}</h1>
            <p className="mt-1 text-[14px] text-muted">{material.name} · listed {fmtDate(listing.createdAt)}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-mist p-4"><p className="text-[12px] text-muted">Available</p><p className="font-display text-[28px] text-forest-950">{fmtKg(listing.quantityKg)}</p></div>
              <div className="rounded-2xl bg-mist p-4"><p className="text-[12px] text-muted">Price</p><p className="font-display text-[28px] text-forest-950">{fmtPricePerKg(listing.pricePerKg)}</p></div>
            </div>
            <p className="mt-3 text-[12.5px] text-muted">Reusing the full lot avoids an estimated {fmtCo2e(estimateCo2eKg(material.id, listing.quantityKg))} (illustrative factor {material.co2eFactor} kgCO₂e/kg).</p>

            {isOwner ? (
              <div className="mt-6 space-y-3">
                <Notice tone="green">This is your listing.</Notice>
                <Button variant="secondary" className="w-full" onClick={() => (listing.status === "active" ? setConfirmClose(true) : (async () => { const r = await setListingStatus(listing.id, "active"); toast(r.ok ? "success" : "error", r.ok ? "Listing reopened" : r.error); })())}>
                  {listing.status === "active" ? "Close listing" : "Reopen listing"}
                </Button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                {openDeal ? (
                  <ButtonLink href={`/negotiations?deal=${openDeal.id}`} className="flex-1">Continue negotiation</ButtonLink>
                ) : me ? (
                  <Button className="flex-1" icon={<Send className="size-4" />} disabled={listing.status !== "active"} onClick={() => setRequestOpen(true)}>Contact seller</Button>
                ) : (
                  <ButtonLink href="/login" className="flex-1">Sign in to contact seller</ButtonLink>
                )}
                <Button
                  variant="secondary"
                  aria-pressed={saved}
                  icon={<Heart className={saved ? "size-4 fill-current text-error" : "size-4"} />}
                  onClick={async () => { const r = await toggleSaved(listing.id); toast(r.ok ? "success" : "info", r.ok ? (r.value ? "Listing saved" : "Removed from saved") : r.error); }}
                >
                  {saved ? "Saved" : "Save listing"}
                </Button>
              </div>
            )}
          </Card>

          {company && (
            <Card className="p-7">
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Supplier</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-full bg-sage font-display text-xl font-semibold text-forest-900">{company.name.charAt(0)}</div>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold">{company.name}{company.verified && <ShieldCheck className="size-4 text-emerald" aria-label="Verified" />}</p>
                  <p className="text-[13px] text-muted">{company.industry} · {cityName(company.cityId)}</p>
                </div>
              </div>
              {avgRating !== null && <p className="mt-3 flex items-center gap-1 text-[13px]"><Star className="size-4 fill-gold text-gold" aria-hidden />{avgRating.toFixed(1)} <span className="text-muted">· {company.reviews.length} review{company.reviews.length === 1 ? "" : "s"}</span></p>}
              <ButtonLink href={`/companies/${company.id}`} variant="secondary" size="sm" className="mt-4">View company profile</ButtonLink>
            </Card>
          )}

          {isOwner && (
            <Card className="p-7">
              <h2 className="font-display text-[24px] text-forest-950">Buyers that fit</h2>
              <p className="mt-1 text-[13px] text-muted">Open requirements ranked by the matching engine.</p>
              <div className="mt-4 space-y-3">
                {buyers.length ? buyers.slice(0, 4).map((m) => <MatchCard key={m.id} match={m} perspective="seller" />) : <p className="text-[14px] text-muted">No compatible requirements yet.</p>}
              </div>
            </Card>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 className="font-display text-[30px] text-forest-950">Similar listings</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{similar.map((l) => <ListingCard key={l.id} listing={l} compact />)}</div>
        </section>
      )}

      {me && !isOwner && <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} listing={listing} />}
      <ConfirmDialog
        open={confirmClose}
        onCancel={() => setConfirmClose(false)}
        onConfirm={async () => { const r = await setListingStatus(listing.id, "closed"); setConfirmClose(false); toast(r.ok ? "success" : "error", r.ok ? "Listing closed" : r.error, r.ok ? "It no longer appears in the marketplace or matches." : undefined); }}
        title="Close this listing?"
        body="It will be hidden from the marketplace and matching. Existing negotiations stay available. You can reopen it later."
        confirmLabel="Close listing"
      />
    </div>
  );
}
