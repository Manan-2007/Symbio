import {
  AVAILABILITY, CONTAMINATION_LEVELS, DEAL_STATUSES, DELIVERY, PAYMENT_METHODS, QUALITY_GRADES, ROLES, UNITS,
} from "./types";
import type { AppState, Company, Deal, Listing, Requirement } from "./types";
import { findCity, findMaterial } from "./catalog";
import { isHashHex, isSaltHex } from "./password";

export const LIMITS = {
  maxKg: 10_000_000,
  maxPricePerKg: 100_000,
  maxText: 1000,
  maxName: 120,
  maxRecords: 2000,
  maxImageChars: 1_500_000, // ~1.1 MB data URL after client-side resize
} as const;

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
const isStr = (v: unknown, max: number = LIMITS.maxText): v is string => typeof v === "string" && v.length <= max;
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 100;
const isDate = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function decimals(value: number, places: number): boolean {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export const isPositiveKg = (v: unknown): v is number => finite(v) && v > 0 && v <= LIMITS.maxKg && decimals(v, 3);
export const isPrice = (v: unknown): v is number => finite(v) && v >= 0 && v <= LIMITS.maxPricePerKg && decimals(v, 2);
export const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Converts a form string to a number, rejecting blanks before conversion. */
/** Indian GSTIN format: 2-digit state, PAN, entity code, 'Z', checksum character. */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function parseNumber(raw: FormDataEntryValue | string | null | undefined): number {
  const text = typeof raw === "string" ? raw.trim() : "";
  return text === "" ? Number.NaN : Number(text);
}

// ---------- Stored-state validation (whole state rejected on any invalid record) ----------

function validCompany(c: unknown): c is Company {
  if (typeof c !== "object" || c === null) return false;
  const v = c as Record<string, unknown>;
  return isId(v.id) && isStr(v.name, LIMITS.maxName) && (v.name as string).trim() !== "" && isStr(v.industry, LIMITS.maxName) &&
    !!findCity(v.cityId as string, v.location) && Array.isArray(v.roles) && v.roles.length > 0 && v.roles.every((r) => oneOf(ROLES, r)) &&
    isStr(v.description) && isStr(v.email, 254) && isStr(v.phone, 40) && typeof v.verified === "boolean" &&
    finite(v.foundedYear) && Array.isArray(v.reviews) && typeof v.isDemo === "boolean" && isDate(v.createdAt) &&
    (v.verification === undefined || validVerification(v.verification));
}

function validVerification(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const v = raw as Record<string, unknown>;
  return oneOf(["pending", "verified", "rejected"] as const, v.status) && typeof v.gstin === "string" && GSTIN_PATTERN.test(v.gstin) &&
    isStr(v.documentName, 200) && isDate(v.submittedAt) && (v.reviewedAt === null || isDate(v.reviewedAt));
}

function validPayment(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const v = raw as Record<string, unknown>;
  return isStr(v.reference, 40) && oneOf(PAYMENT_METHODS, v.method) && finite(v.amountInr) && v.amountInr >= 0 &&
    oneOf(["held_in_escrow", "released", "refunded"] as const, v.status) && isDate(v.paidAt) && (v.settledAt === null || isDate(v.settledAt));
}

function validListing(l: unknown, companyIds: Set<string>): l is Listing {
  if (typeof l !== "object" || l === null) return false;
  const v = l as Record<string, unknown>;
  return isId(v.id) && companyIds.has(v.companyId as string) && !!findMaterial(v.materialId as string) &&
    isStr(v.title, LIMITS.maxName) && isStr(v.description) && isPositiveKg(v.quantity) && oneOf(UNITS, v.unit) &&
    isPositiveKg(v.quantityKg) && isPrice(v.pricePerKg) && !!findCity(v.cityId as string, v.location) && oneOf(QUALITY_GRADES, v.quality) &&
    finite(v.moisturePct) && v.moisturePct >= 0 && v.moisturePct <= 100 && oneOf(CONTAMINATION_LEVELS, v.contamination) &&
    oneOf(AVAILABILITY, v.availability) && (v.imageDataUrl === null || (isStr(v.imageDataUrl, LIMITS.maxImageChars) && (v.imageDataUrl as string).startsWith("data:image/"))) &&
    (v.status === "active" || v.status === "closed") && isDate(v.createdAt);
}

function validRequirement(r: unknown, companyIds: Set<string>): r is Requirement {
  if (typeof r !== "object" || r === null) return false;
  const v = r as Record<string, unknown>;
  return isId(v.id) && companyIds.has(v.companyId as string) && !!findMaterial(v.materialId as string) && isPositiveKg(v.quantityKg) &&
    isPrice(v.maxBudgetPerKg) && !!findCity(v.cityId as string, v.location) && finite(v.maxDistanceKm) && v.maxDistanceKm > 0 && v.maxDistanceKm <= 3000 &&
    oneOf(QUALITY_GRADES, v.minQuality) && oneOf(CONTAMINATION_LEVELS, v.maxContamination) &&
    (v.maxMoisturePct === null || (finite(v.maxMoisturePct) && v.maxMoisturePct >= 0 && v.maxMoisturePct <= 100)) &&
    oneOf(DELIVERY, v.delivery) && isStr(v.notes) && (v.status === "open" || v.status === "closed") && isDate(v.createdAt);
}

function validDeal(d: unknown, companyIds: Set<string>, listings: Map<string, Listing>, requirementIds: Set<string>): d is Deal {
  if (typeof d !== "object" || d === null) return false;
  const v = d as Record<string, unknown>;
  const listing = listings.get(v.listingId as string);
  if (!isId(v.id) || !listing || listing.companyId !== v.sellerId || !companyIds.has(v.buyerId as string) || v.buyerId === v.sellerId) return false;
  if (v.requirementId !== null && !requirementIds.has(v.requirementId as string)) return false;
  if (!oneOf(DEAL_STATUSES, v.status) || !isDate(v.createdAt) || !isDate(v.updatedAt)) return false;
  const parties = new Set([v.buyerId, v.sellerId]);
  return Array.isArray(v.offers) && v.offers.length > 0 && v.offers.every((o: Record<string, unknown>) =>
      isId(o?.id) && parties.has(o.byCompanyId) && isPositiveKg(o.quantityKg) && isPrice(o.pricePerKg) && isStr(o.note) && isDate(o.createdAt)) &&
    Array.isArray(v.messages) && v.messages.every((m: Record<string, unknown>) => isId(m?.id) && parties.has(m.companyId) && isStr(m.text) && isDate(m.createdAt)) &&
    Array.isArray(v.history) && v.history.every((h: Record<string, unknown>) => oneOf(DEAL_STATUSES, h?.status) && parties.has(h.byCompanyId) && isDate(h.at)) &&
    (v.payment === undefined || validPayment(v.payment));
}

export function validateAppState(raw: unknown): AppState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (v.schemaVersion !== 2) return null;
  const arrays = [v.accounts, v.companies, v.listings, v.requirements, v.deals];
  if (!arrays.every((a) => Array.isArray(a) && a.length <= LIMITS.maxRecords)) return null;

  const companies = v.companies as unknown[];
  if (!companies.every(validCompany)) return null;
  const companyIds = new Set(companies.map((c) => c.id));
  if (companyIds.size !== companies.length) return null;

  const listings = v.listings as unknown[];
  if (!listings.every((l) => validListing(l, companyIds))) return null;
  const listingMap = new Map(listings.map((l) => [l.id, l]));
  if (listingMap.size !== listings.length) return null;

  const requirements = v.requirements as unknown[];
  if (!requirements.every((r) => validRequirement(r, companyIds))) return null;
  const requirementIds = new Set(requirements.map((r) => r.id));
  if (requirementIds.size !== requirements.length) return null;

  const deals = v.deals as unknown[];
  if (!deals.every((d) => validDeal(d, companyIds, listingMap, requirementIds))) return null;
  if (new Set(deals.map((d) => d.id)).size !== deals.length) return null;

  const accounts = v.accounts as { email?: unknown; companyId?: unknown; salt?: unknown; passwordHash?: unknown }[];
  if (!accounts.every((a) => isEmail(a?.email) && companyIds.has(a.companyId as string) && isSaltHex(a.salt) && isHashHex(a.passwordHash))) return null;
  if (new Set(accounts.map((a) => (a.email as string).toLowerCase())).size !== accounts.length) return null;

  const session = v.session as { companyId?: unknown } | null;
  if (session !== null && !(typeof session === "object" && companyIds.has(session.companyId as string))) return null;

  const saved = v.savedListingIds;
  if (typeof saved !== "object" || saved === null || Array.isArray(saved)) return null;
  for (const [companyId, ids] of Object.entries(saved)) {
    if (!companyIds.has(companyId) || !Array.isArray(ids) || !ids.every((id) => listingMap.has(id))) return null;
  }

  const seen = v.notificationsSeenAt;
  if (seen !== undefined) {
    if (typeof seen !== "object" || seen === null || Array.isArray(seen)) return null;
    for (const [companyId, at] of Object.entries(seen)) if (!companyIds.has(companyId) || !isDate(at)) return null;
  }

  return raw as AppState;
}
