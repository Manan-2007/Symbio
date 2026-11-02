import { CONTAMINATION_LEVELS, QUALITY_GRADES } from "./types";
import type { Listing, Requirement } from "./types";
import { cityName, findCity, findMaterial, materialCompatibility } from "./catalog";
import { haversineKm } from "./geo";

// Score = (M × 0.40) + (Q × 0.25) + (D × 0.25) + (P × 0.10), each factor in 0–1, shown as 0–100%.
export const WEIGHTS = { material: 0.4, quantity: 0.25, distance: 0.25, price: 0.1 } as const;

export type Breakdown = { material: number; quantity: number; distance: number; price: number };

export type Match = {
  id: string; // `${listingId}__${requirementId}`
  listing: Listing;
  requirement: Requirement;
  score: number; // 0–100, one decimal
  breakdown: Breakdown;
  distanceKm: number;
  usableKg: number;
  reasons: string[];
  cautions: string[];
};

export type Rejection = { listingId: string; requirementId: string; reason: string };

export function matchId(listingId: string, requirementId: string): string {
  return `${listingId}__${requirementId}`;
}

export function parseMatchId(id: string): { listingId: string; requirementId: string } | null {
  const [listingId, requirementId, extra] = id.split("__");
  return listingId && requirementId && extra === undefined ? { listingId, requirementId } : null;
}

const qualityRank = (grade: string) => QUALITY_GRADES.length - QUALITY_GRADES.indexOf(grade as never); // A=3, C=1
const contaminationRank = (level: string) => CONTAMINATION_LEVELS.indexOf(level as never); // none=0

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function priceCompatibility(pricePerKg: number, budgetPerKg: number): number {
  if (pricePerKg <= budgetPerKg) return 1;
  if (budgetPerKg <= 0) return 0;
  return Math.max(0, 1 - (pricePerKg - budgetPerKg) / budgetPerKg);
}

/**
 * Evaluates one listing against one requirement. Hard gates (material, quality,
 * contamination, moisture, radius, ownership, minimum viable quantity) reject the pair;
 * otherwise a weighted score with explanations is returned.
 */
export function evaluate(listing: Listing, requirement: Requirement): Match | Rejection {
  const reject = (reason: string): Rejection => ({ listingId: listing.id, requirementId: requirement.id, reason });
  if (listing.status !== "active" || requirement.status !== "open") return reject("Listing or requirement is closed.");
  if (listing.companyId === requirement.companyId) return reject("Same company on both sides.");

  const material = materialCompatibility(listing.materialId, requirement.materialId);
  if (material === 0) return reject("Incompatible material.");
  if (qualityRank(listing.quality) < qualityRank(requirement.minQuality)) return reject(`Quality grade ${listing.quality} is below the required grade ${requirement.minQuality}.`);
  if (contaminationRank(listing.contamination) > contaminationRank(requirement.maxContamination)) return reject(`Contamination (${listing.contamination}) exceeds the buyer's limit (${requirement.maxContamination}).`);
  if (requirement.maxMoisturePct !== null && listing.moisturePct > requirement.maxMoisturePct) return reject(`Moisture ${listing.moisturePct}% exceeds the ${requirement.maxMoisturePct}% limit.`);

  const from = findCity(listing.cityId, listing.location);
  const to = findCity(requirement.cityId, requirement.location);
  if (!from || !to) return reject("Unknown location.");
  const distanceKm = haversineKm(from, to);
  if (distanceKm > requirement.maxDistanceKm) return reject(`About ${Math.round(distanceKm)} km away, beyond the ${requirement.maxDistanceKm} km radius.`);
  if (!(requirement.quantityKg > 0) || !(requirement.maxDistanceKm > 0)) return reject("Requirement is incomplete.");

  const usableKg = Math.min(listing.quantityKg, requirement.quantityKg);
  const breakdown: Breakdown = {
    material,
    quantity: usableKg / requirement.quantityKg,
    distance: Math.max(0, 1 - distanceKm / requirement.maxDistanceKm),
    price: priceCompatibility(listing.pricePerKg, requirement.maxBudgetPerKg),
  };
  const score = round1(
    100 * (breakdown.material * WEIGHTS.material + breakdown.quantity * WEIGHTS.quantity + breakdown.distance * WEIGHTS.distance + breakdown.price * WEIGHTS.price),
  );

  const supplied = findMaterial(listing.materialId)?.name ?? listing.materialId;
  const reasons = [
    material === 1 ? `Exact material match: ${supplied}` : `${supplied} is an accepted substitute (${Math.round(material * 100)}% compatible)`,
    breakdown.quantity >= 1 ? `Covers the full ${requirement.quantityKg.toLocaleString("en-IN")} kg requirement` : `Covers ${Math.round(breakdown.quantity * 100)}% of the requirement`,
    `About ${distanceKm.toFixed(1)} km from ${cityName(requirement.cityId, requirement.location)} (straight-line)`,
    breakdown.price === 1 ? `₹${listing.pricePerKg}/kg is within the ₹${requirement.maxBudgetPerKg}/kg budget` : `₹${listing.pricePerKg}/kg is above the ₹${requirement.maxBudgetPerKg}/kg budget`,
    `Quality ${listing.quality} and ${listing.contamination} contamination meet the specification`,
  ];
  const cautions: string[] = [];
  if (breakdown.price < 1) cautions.push("Price is above budget; negotiation needed.");
  if (breakdown.quantity < 0.5) cautions.push("Supplies less than half the requirement.");
  return { id: matchId(listing.id, requirement.id), listing, requirement, score, breakdown, distanceKm, usableKg, reasons, cautions };
}

export function isMatch(result: Match | Rejection): result is Match {
  return "score" in result;
}

function byRank(a: Match, b: Match): number {
  return b.score - a.score || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id);
}

/** Ranked supply for one buyer requirement. */
export function matchesForRequirement(requirement: Requirement, listings: readonly Listing[]): Match[] {
  return listings.map((l) => evaluate(l, requirement)).filter(isMatch).sort(byRank);
}

/** Ranked buyers for one supplier listing. */
export function matchesForListing(listing: Listing, requirements: readonly Requirement[]): Match[] {
  return requirements.map((r) => evaluate(listing, r)).filter(isMatch).sort(byRank);
}

/** Every match where the company is buyer or supplier. */
export function matchesForCompany(companyId: string, listings: readonly Listing[], requirements: readonly Requirement[]): Match[] {
  const out: Match[] = [];
  for (const r of requirements) for (const l of listings) {
    if (r.companyId !== companyId && l.companyId !== companyId) continue;
    const result = evaluate(l, r);
    if (isMatch(result)) out.push(result);
  }
  return out.sort(byRank);
}
