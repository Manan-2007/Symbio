import { BUSINESSES, REQUIREMENTS } from "./seed";
import { CITIES, MATERIALS } from "./types";
import type { City, DemoState, Diversion, Enquiry, Listing, Material } from "./types";

// Bounds from plan.md §6. Shared by stored-data validation and provider actions
// so a record that can be created can always be loaded back, and vice versa.
export const MAX_QUANTITY_KG = 1_000_000;
export const MAX_PRICE_PER_KG = 1_000_000;
export const QUANTITY_DECIMALS = 3;
export const PRICE_DECIMALS = 2;
const MAX_ID_LENGTH = 100;
const MAX_LISTINGS = 1000;
const MAX_ENQUIRIES = 1000;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMaterial(value: unknown): value is Material {
  return typeof value === "string" && (MATERIALS as readonly string[]).includes(value);
}

export function isCity(value: unknown): value is City {
  return typeof value === "string" && (CITIES as readonly string[]).includes(value);
}

export function isKnownBusinessId(value: unknown): value is string {
  return typeof value === "string" && BUSINESSES.some((business) => business.id === value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function hasAtMostDecimals(value: number, decimals: number): boolean {
  const scaled = value * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export function isValidQuantityKg(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_QUANTITY_KG &&
    hasAtMostDecimals(value, QUANTITY_DECIMALS)
  );
}

export function isValidPricePerKg(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_PRICE_PER_KG &&
    hasAtMostDecimals(value, PRICE_DECIMALS)
  );
}

/** Usable quantity for a listing/requirement pair; enquiries must request exactly this. */
export function usableKg(listingQuantityKg: number, requiredKg: number): number {
  return Math.min(listingQuantityKg, requiredKg);
}

export function validateListing(value: unknown): Listing | null {
  if (!isRecord(value)) return null;
  const { id, businessId, material, quantityKg, pricePerKg, city, cleanUntreated, createdAt } = value;
  if (
    !isId(id) ||
    !isKnownBusinessId(businessId) ||
    !isMaterial(material) ||
    !isValidQuantityKg(quantityKg) ||
    !isValidPricePerKg(pricePerKg) ||
    !isCity(city) ||
    cleanUntreated !== true ||
    !isIsoDate(createdAt)
  ) {
    return null;
  }
  return { id, businessId, material, quantityKg, pricePerKg, city, cleanUntreated, createdAt };
}

/**
 * Checks an enquiry against the listings it references. The buyer must own a
 * requirement for the listing's material, must not be the supplier, and the
 * quantity must fit both the listing and the requirement.
 */
export function validateEnquiry(value: unknown, listings: readonly Listing[]): Enquiry | null {
  if (!isRecord(value)) return null;
  const { id, listingId, buyerBusinessId, quantityKg, createdAt, status } = value;
  if (
    !isId(id) ||
    !isId(listingId) ||
    !isKnownBusinessId(buyerBusinessId) ||
    !isValidQuantityKg(quantityKg) ||
    !isIsoDate(createdAt) ||
    status !== "sent"
  ) {
    return null;
  }
  const listing = listings.find((candidate) => candidate.id === listingId);
  if (!listing || listing.businessId === buyerBusinessId) return null;
  const requirement = REQUIREMENTS.find(
    (candidate) => candidate.businessId === buyerBusinessId && candidate.material === listing.material,
  );
  if (!requirement) return null;
  if (quantityKg > usableKg(listing.quantityKg, requirement.requiredKg)) return null;
  return { id, listingId, buyerBusinessId, quantityKg, createdAt, status };
}

/** Validates a whole parsed state. Any invalid record rejects the state rather than being silently dropped. */
export function validateDemoState(value: unknown): DemoState | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  const { selectedBusinessId, listings: rawListings, enquiries: rawEnquiries } = value;
  if (!isKnownBusinessId(selectedBusinessId)) return null;
  if (!Array.isArray(rawListings) || rawListings.length > MAX_LISTINGS) return null;
  if (!Array.isArray(rawEnquiries) || rawEnquiries.length > MAX_ENQUIRIES) return null;

  const listings: Listing[] = [];
  const listingIds = new Set<string>();
  for (const raw of rawListings) {
    const listing = validateListing(raw);
    if (!listing || listingIds.has(listing.id)) return null;
    listingIds.add(listing.id);
    listings.push(listing);
  }

  const enquiries: Enquiry[] = [];
  const enquiryIds = new Set<string>();
  const pairs = new Set<string>();
  for (const raw of rawEnquiries) {
    const enquiry = validateEnquiry(raw, listings);
    if (!enquiry || enquiryIds.has(enquiry.id)) return null;
    const pair = `${enquiry.listingId}|${enquiry.buyerBusinessId}`;
    if (pairs.has(pair)) return null;
    enquiryIds.add(enquiry.id);
    pairs.add(pair);
    enquiries.push(enquiry);
  }

  // Additive v1 upgrade: Phase 1 data has no diversions field.
  const rawDiversions = value.diversions === undefined ? [] : value.diversions;
  if (!Array.isArray(rawDiversions) || rawDiversions.length > MAX_ENQUIRIES) return null;
  const diversions: Diversion[] = [];
  const ids = new Set<string>();
  const recorded = new Set<string>();
  const listingTotals = new Map<string, number>();
  const buyerTotals = new Map<string, number>();
  for (const raw of rawDiversions) {
    if (!isRecord(raw) || !isId(raw.id) || !isId(raw.enquiryId) || !isValidQuantityKg(raw.quantityKg) || !isIsoDate(raw.createdAt)) return null;
    const enquiry = enquiries.find((e) => e.id === raw.enquiryId);
    if (!enquiry || raw.quantityKg > enquiry.quantityKg || ids.has(raw.id) || recorded.has(raw.enquiryId)) return null;
    const listing = listings.find((l) => l.id === enquiry.listingId)!;
    const requirement = REQUIREMENTS.find((r) => r.businessId === enquiry.buyerBusinessId && r.material === listing.material)!;
    const supplied = (listingTotals.get(listing.id) ?? 0) + Math.round(raw.quantityKg * 1000);
    const received = (buyerTotals.get(requirement.id) ?? 0) + Math.round(raw.quantityKg * 1000);
    if (supplied > Math.round(listing.quantityKg * 1000) || received > Math.round(requirement.requiredKg * 1000)) return null;
    listingTotals.set(listing.id, supplied);
    buyerTotals.set(requirement.id, received);
    ids.add(raw.id);
    recorded.add(raw.enquiryId);
    diversions.push({ id: raw.id, enquiryId: raw.enquiryId, quantityKg: raw.quantityKg, createdAt: raw.createdAt });
  }
  return { schemaVersion: 1, selectedBusinessId, listings, enquiries, diversions };
}
