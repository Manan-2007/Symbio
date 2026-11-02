import { CATEGORIES } from "./types";
import type { AppState, Category, Deal } from "./types";
import { CATEGORY_LABELS, findMaterial } from "./catalog";
import { agreedTerms, impactRecords, impactTotals } from "./carbonCalculator";
import type { ImpactRecord } from "./carbonCalculator";
import { matchesForCompany } from "./matchingEngine";
import { OPEN_STATUSES } from "./actions";

const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

/** Last `count` calendar months ending at `now`, oldest first. */
export function monthBuckets(now: string, count = 6): { key: string; label: string }[] {
  const end = new Date(now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (count - 1 - i), 1));
    return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, label: MONTH.format(d) };
  });
}

export function monthlySeries(records: readonly ImpactRecord[], now: string, count = 6) {
  return monthBuckets(now, count).map(({ key, label }) => {
    const inMonth = records.filter((r) => r.completedAt.slice(0, 7) === key);
    return { month: label, kg: inMonth.reduce((s, r) => s + r.kg, 0), co2e: Math.round(inMonth.reduce((s, r) => s + r.co2eKg, 0)), exchanges: inMonth.length };
  });
}

export function categorySeries(records: readonly ImpactRecord[]) {
  return CATEGORIES.map((category) => {
    const inCat = records.filter((r) => r.category === category);
    return { category, label: CATEGORY_LABELS[category], kg: inCat.reduce((s, r) => s + r.kg, 0), co2e: Math.round(inCat.reduce((s, r) => s + r.co2eKg, 0)) };
  }).filter((row) => row.kg > 0);
}

export function listingCategoryBreakdown(state: AppState, companyId?: string): { category: Category; label: string; kg: number }[] {
  return CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    kg: state.listings
      .filter((l) => l.status === "active" && (!companyId || l.companyId === companyId) && findMaterial(l.materialId)?.category === category)
      .reduce((s, l) => s + l.quantityKg, 0),
  })).filter((row) => row.kg > 0);
}

export type Activity = { id: string; dealId: string; at: string; text: string; status: Deal["status"] };

export function recentActivity(state: AppState, companyId: string, limit = 6): Activity[] {
  const name = (id: string) => state.companies.find((c) => c.id === id)?.name ?? "A company";
  const verbs: Record<Deal["status"], string> = {
    requested: "sent a purchase request", negotiating: "made a counter-offer", accepted: "accepted the exchange",
    rejected: "declined the request", in_transit: "dispatched the material", completed: "confirmed receipt", cancelled: "cancelled the exchange",
  };
  return state.deals
    .filter((d) => d.buyerId === companyId || d.sellerId === companyId)
    .flatMap((d) => {
      const listing = state.listings.find((l) => l.id === d.listingId);
      const material = listing ? findMaterial(listing.materialId)?.name ?? "material" : "material";
      return d.history.map((h, i) => ({
        id: `${d.id}-${i}`, dealId: d.id, at: h.at, status: h.status,
        text: `${h.byCompanyId === companyId ? "You" : name(h.byCompanyId)} ${verbs[h.status]} · ${material}`,
      }));
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

export function dashboardStats(state: AppState, companyId: string) {
  const records = impactRecords(state, companyId);
  const totals = impactTotals(records);
  return {
    totalListedKg: state.listings.filter((l) => l.companyId === companyId && l.status === "active").reduce((s, l) => s + l.quantityKg, 0),
    activeMatches: matchesForCompany(companyId, state.listings, state.requirements).length,
    openDeals: state.deals.filter((d) => (d.buyerId === companyId || d.sellerId === companyId) && OPEN_STATUSES.includes(d.status)).length,
    completedExchanges: totals.exchanges,
    reusedKg: totals.reusedKg,
    co2eKg: totals.co2eKg,
    records,
  };
}

export function transactionValue(deal: Deal): number {
  const { quantityKg, pricePerKg } = agreedTerms(deal);
  return quantityKg * pricePerKg;
}

/** 0–100 heuristic shown on profiles. Demo only: verification + reviews + completed exchanges. */
export function trustScore(state: AppState, companyId: string): number {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) return 0;
  const ratings = company.reviews.map((r) => r.rating);
  const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 3;
  const completed = impactRecords(state, companyId).length;
  return Math.min(100, Math.round((company.verified ? 35 : 10) + avg * 8 + Math.min(completed, 5) * 5));
}
