"use client";

import Link from "next/link";
import { Heart, MapPin, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/primitives";
import { MaterialArt } from "@/components/ui/visuals";
import { CATEGORY_LABELS, cityName, findMaterial } from "@/services/catalog";
import type { Listing } from "@/services/types";
import { cx, fmtKg, fmtPricePerKg } from "@/utils/format";

export function ListingCard({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const { state, me, toggleSaved } = useApp();
  const { toast } = useToast();
  const material = findMaterial(listing.materialId);
  const company = state.companies.find((c) => c.id === listing.companyId);
  const saved = me ? (state.savedListingIds[me.id] ?? []).includes(listing.id) : false;
  if (!material) return null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-soft transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className={cx("relative", compact ? "h-36" : "h-44")}>
        <MaterialArt category={material.category} imageUrl={listing.imageDataUrl} alt={listing.title} className="h-full" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge tone="neutral" className="border-white/70 bg-white/85 backdrop-blur-sm">{CATEGORY_LABELS[material.category]}</Badge>
          {listing.status === "closed" && <Badge tone="red">Closed</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[22px] leading-tight text-forest-950">
            <Link href={`/marketplace/${listing.id}`} className="focus-ring rounded after:absolute after:inset-0 after:content-['']">{listing.title}</Link>
          </h3>
          <p className="shrink-0 pt-1 text-[15px] font-bold text-forest">{fmtPricePerKg(listing.pricePerKg)}</p>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
          {company?.name ?? "Unknown company"}
          {company?.verified && <ShieldCheck className="size-3.5 text-emerald" aria-label="Verified company" />}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-4 text-[13px] text-ink/80">
          <span className="font-semibold text-ink">{fmtKg(listing.quantityKg)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-muted" aria-hidden />{cityName(listing.cityId)}</span>
          <span>Grade {listing.quality}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={async () => {
          const r = await toggleSaved(listing.id);
          if (!r.ok) toast("info", r.error);
          else toast("success", r.value ? "Listing saved" : "Removed from saved");
        }}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
        className="focus-ring absolute top-3 right-14 z-10 grid size-9 place-items-center rounded-full bg-white/85 text-forest shadow-soft backdrop-blur-sm transition-transform hover:scale-105"
      >
        <Heart className={cx("size-[17px]", saved && "fill-current text-error")} />
      </button>
    </article>
  );
}
