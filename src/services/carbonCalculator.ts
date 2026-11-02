import type { AppState, Category, Deal } from "./types";
import { findMaterial } from "./catalog";

// Estimated avoided CO2e = reused quantity × material-specific avoidance factor.
// Factors in catalog.ts are illustrative demo values. Nothing here is a certified offset.

export const CARBON_DISCLAIMER =
  "Illustrative estimate only. Uses invented, material-specific demo factors (kgCO₂e avoided per kg reused instead of landfilled). Not certified carbon offsets or credits.";

export function estimateCo2eKg(materialId: string, reusedKg: number): number {
  const factor = findMaterial(materialId)?.co2eFactor ?? 0;
  return reusedKg > 0 && Number.isFinite(reusedKg) ? reusedKg * factor : 0;
}

/** Agreed quantity of a deal: the latest offer. */
export function agreedTerms(deal: Deal): { quantityKg: number; pricePerKg: number } {
  const last = deal.offers[deal.offers.length - 1];
  return { quantityKg: last?.quantityKg ?? 0, pricePerKg: last?.pricePerKg ?? 0 };
}

export type ImpactRecord = { deal: Deal; materialId: string; category: Category; kg: number; co2eKg: number; completedAt: string };

/** Only completed exchanges count as reuse. Requests, negotiations and shipments in transit contribute zero. */
export function impactRecords(state: AppState, companyId?: string): ImpactRecord[] {
  return state.deals.flatMap((deal) => {
    if (deal.status !== "completed") return [];
    if (companyId && deal.buyerId !== companyId && deal.sellerId !== companyId) return [];
    const listing = state.listings.find((l) => l.id === deal.listingId);
    const material = listing && findMaterial(listing.materialId);
    if (!listing || !material) return [];
    const { quantityKg } = agreedTerms(deal);
    const completedAt = deal.history.find((h) => h.status === "completed")?.at ?? deal.updatedAt;
    return [{ deal, materialId: material.id, category: material.category, kg: quantityKg, co2eKg: estimateCo2eKg(material.id, quantityKg), completedAt }];
  });
}

export function impactTotals(records: readonly ImpactRecord[]) {
  return {
    reusedKg: records.reduce((s, r) => s + r.kg, 0),
    co2eKg: records.reduce((s, r) => s + r.co2eKg, 0),
    exchanges: records.length,
  };
}
