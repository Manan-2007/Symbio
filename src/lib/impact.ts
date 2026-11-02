import type { DemoState } from "./types";

// Invented scenario assumption, NOT a measured or material-specific emissions factor.
export const DEMO_FACTOR = 0.4;
export const IMPACT_NOTE = "Illustrative scenario only. Assumes 0.4 kgCO₂e avoided per kg reused instead of landfilled. Actual impacts depend on disposal, processing and transport, which this model does not calculate. Not verified carbon offsets.";

export function calculateImpact(quantityKg: number, pricePerKg = 0, factor = DEMO_FACTOR) {
  if (![quantityKg, pricePerKg, factor].every((n) => Number.isFinite(n) && n >= 0)) return null;
  return { quantityKg, valueINR: quantityKg * pricePerKg, avoidedKgCO2e: quantityKg * factor };
}

export function impactTotals(state: DemoState, businessId?: string) {
  const records = state.diversions.filter((record) => {
    const enquiry = state.enquiries.find((e) => e.id === record.enquiryId)!;
    const listing = state.listings.find((l) => l.id === enquiry.listingId)!;
    return !businessId || enquiry.buyerBusinessId === businessId || listing.businessId === businessId;
  });
  const quantityKg = records.reduce((sum, record) => sum + record.quantityKg, 0);
  return { ...calculateImpact(quantityKg)!, count: records.length };
}
