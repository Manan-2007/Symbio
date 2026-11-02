"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge } from "@/components/ui/primitives";
import { ScoreRing } from "@/components/ui/visuals";
import { cityName, materialName } from "@/services/catalog";
import type { Match } from "@/services/matchingEngine";
import { fmtKg, fmtPricePerKg } from "@/utils/format";

/** Compact ranked-match row. `perspective` decides which counterparty is shown. */
export function MatchCard({ match, perspective }: { match: Match; perspective: "buyer" | "seller" }) {
  const { state } = useApp();
  const counterpartyId = perspective === "buyer" ? match.listing.companyId : match.requirement.companyId;
  const counterparty = state.companies.find((c) => c.id === counterpartyId);
  return (
    <Link href={`/matches/${match.id}`} className="group focus-ring flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-forest/40 hover:shadow-soft">
      <ScoreRing score={match.score} size={62} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{counterparty?.name ?? "Unknown company"}</p>
        <p className="truncate text-[13px] text-muted">
          {perspective === "buyer"
            ? `${materialName(match.listing.materialId)} · ${fmtKg(match.listing.quantityKg)} · ${fmtPricePerKg(match.listing.pricePerKg)}`
            : `Needs ${fmtKg(match.requirement.quantityKg)} ${materialName(match.requirement.materialId).toLowerCase()} · budget ${fmtPricePerKg(match.requirement.maxBudgetPerKg)}`}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{cityName(perspective === "buyer" ? match.listing.cityId : match.requirement.cityId, perspective === "buyer" ? match.listing.location : match.requirement.location)} · ~{Math.round(match.distanceKm)} km</span>
          {match.breakdown.material < 1 && <Badge tone="gold">Substitute</Badge>}
          {match.cautions.length > 0 && <Badge tone="gold">Negotiate price</Badge>}
        </div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-forest" aria-hidden />
    </Link>
  );
}
