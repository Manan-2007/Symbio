import { AVAILABILITY, CONTAMINATION_LEVELS, DELIVERY, QUALITY_GRADES, ROLES, UNITS } from "./types";
import { PAYMENT_METHODS } from "./types";
import type { Account, AppState, Company, Deal, DealStatus, Listing, Requirement, Result, Role } from "./types";
import { findCity, findMaterial } from "./catalog";
import { GSTIN_PATTERN, LIMITS, decimals, isEmail, isPositiveKg, isPrice } from "./validation";
import { isHashHex, isSaltHex } from "./password";

// Pure state transitions. The provider supplies IDs and timestamps so these stay
// deterministic and testable; it also persists the returned state.

export type Ctx = { newId: () => string; now: string };

const fail = (error: string): Result<never> => ({ ok: false, error });
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function sessionCompany(state: AppState): Company | null {
  return state.session ? state.companies.find((c) => c.id === state.session!.companyId) ?? null : null;
}

// ---------- Demo authentication (credentials hashed in localStorage) ----------

export function findAccount(state: AppState, email: unknown): Account | undefined {
  const normalized = text(email).toLowerCase();
  return state.accounts.find((a) => a.email.toLowerCase() === normalized);
}

export function loginAsCompany(state: AppState, companyId: string): Result<AppState> {
  if (!state.companies.some((c) => c.id === companyId)) return fail("Unknown company.");
  return { ok: true, value: { ...state, session: { companyId } } };
}

export function logout(state: AppState): AppState {
  return { ...state, session: null };
}

export type RegisterInput = {
  companyName: unknown; email: unknown; password: unknown; industry: unknown; cityId: unknown; location?: unknown; phone: unknown; roles: unknown;
  /** Computed by the caller from `password` with hashPassword(); the plain password is never stored. */
  salt?: unknown; passwordHash?: unknown;
};

export function register(state: AppState, input: RegisterInput, ctx: Ctx): Result<AppState> {
  const name = text(input.companyName);
  const email = text(input.email).toLowerCase();
  const industry = text(input.industry);
  const phone = text(input.phone);
  if (name.length < 2 || name.length > LIMITS.maxName) return fail("Enter your company name.");
  if (!isEmail(email)) return fail("Enter a valid business email.");
  if (state.accounts.some((a) => a.email.toLowerCase() === email)) return fail("An account with this email already exists. Sign in instead.");
  if (typeof input.password !== "string" || input.password.length < 8) return fail("Password must be at least 8 characters.");
  if (!isSaltHex(input.salt) || !isHashHex(input.passwordHash)) return fail("Could not secure the password. Try again.");
  if (industry.length < 2 || industry.length > LIMITS.maxName) return fail("Enter your industry.");
  const location = findCity(input.cityId as string, input.location);
  if (!location) return fail("Choose a location.");
  if (!/^[+\d][\d\s-]{6,19}$/.test(phone)) return fail("Enter a contact number.");
  if (!Array.isArray(input.roles) || input.roles.length === 0 || !input.roles.every((r) => oneOf(ROLES, r))) return fail("Choose an account role.");
  if (state.companies.length >= LIMITS.maxRecords) return fail("Demo company limit reached.");

  const company: Company = {
    id: ctx.newId(), name, industry, cityId: location.id, location, roles: [...new Set(input.roles as Role[])], description: "",
    email, phone, verified: false, foundedYear: new Date(ctx.now).getFullYear(), reviews: [], isDemo: false, createdAt: ctx.now,
  };
  return {
    ok: true,
    value: { ...state, companies: [...state.companies, company], accounts: [...state.accounts, { email, companyId: company.id, salt: input.salt, passwordHash: input.passwordHash }], session: { companyId: company.id } },
  };
}

export type ProfileInput = { name: unknown; industry: unknown; cityId: unknown; location?: unknown; phone: unknown; description: unknown; roles: unknown; foundedYear: unknown };

export function updateProfile(state: AppState, input: ProfileInput): Result<AppState> {
  const me = sessionCompany(state);
  if (!me) return fail("Sign in first.");
  const name = text(input.name);
  const industry = text(input.industry);
  const description = text(input.description);
  const phone = text(input.phone);
  const year = input.foundedYear;
  if (name.length < 2 || name.length > LIMITS.maxName) return fail("Enter your company name.");
  if (industry.length < 2 || industry.length > LIMITS.maxName) return fail("Enter your industry.");
  const location = findCity(input.cityId as string, input.location);
  if (!location) return fail("Choose a location.");
  if (!/^[+\d][\d\s-]{6,19}$/.test(phone)) return fail("Enter a contact number.");
  if (description.length > LIMITS.maxText) return fail("Description is too long.");
  if (typeof year !== "number" || !Number.isInteger(year) || year < 1800 || year > new Date().getFullYear()) return fail("Enter a valid founding year.");
  if (!Array.isArray(input.roles) || input.roles.length === 0 || !input.roles.every((r) => oneOf(ROLES, r))) return fail("Choose at least one role.");
  const updated: Company = { ...me, name, industry, cityId: location.id, location, phone, description, foundedYear: year, roles: [...new Set(input.roles as Role[])] };
  return { ok: true, value: { ...state, companies: state.companies.map((c) => (c.id === me.id ? updated : c)) } };
}

// ---------- Listings and requirements ----------

export type ListingInput = {
  materialId: unknown; title: unknown; description: unknown; quantity: unknown; unit: unknown; pricePerKg: unknown; cityId: unknown; location?: unknown;
  quality: unknown; moisturePct: unknown; contamination: unknown; availability: unknown; imageDataUrl: unknown;
};

export function addListing(state: AppState, input: ListingInput, ctx: Ctx): Result<{ state: AppState; listing: Listing }> {
  const me = sessionCompany(state);
  if (!me) return fail("Sign in to list materials.");
  if (!me.roles.includes("generator")) return fail("Only Waste Generator accounts can list materials. Add the role in your profile.");
  const material = findMaterial(input.materialId as string);
  if (!material) return fail("Choose a material.");
  const title = text(input.title) || material.name;
  if (title.length > LIMITS.maxName) return fail("Title is too long.");
  const description = text(input.description);
  if (description.length > LIMITS.maxText) return fail("Description is too long.");
  if (!oneOf(UNITS, input.unit)) return fail("Choose a unit.");
  if (!isPositiveKg(input.quantity)) return fail("Quantity must be a positive number with up to 3 decimals.");
  const quantityKg = input.unit === "tonne" ? Math.round((input.quantity as number) * 1000 * 1000) / 1000 : (input.quantity as number);
  if (!isPositiveKg(quantityKg)) return fail("Quantity is too large.");
  if (!isPrice(input.pricePerKg)) return fail("Price must be ₹0 or more per kg, with up to 2 decimals. Use 0 for free.");
  const location = findCity(input.cityId as string, input.location);
  if (!location) return fail("Choose a location.");
  if (!oneOf(QUALITY_GRADES, input.quality)) return fail("Choose a quality grade.");
  const moisture = input.moisturePct;
  if (typeof moisture !== "number" || !Number.isFinite(moisture) || moisture < 0 || moisture > 100 || !decimals(moisture, 1)) return fail("Moisture must be between 0 and 100%.");
  if (!oneOf(CONTAMINATION_LEVELS, input.contamination)) return fail("Choose a contamination level.");
  if (!oneOf(AVAILABILITY, input.availability)) return fail("Choose availability.");
  const image = input.imageDataUrl;
  if (image !== null && !(typeof image === "string" && image.startsWith("data:image/") && image.length <= LIMITS.maxImageChars)) return fail("Image is too large or not an image.");
  if (state.listings.length >= LIMITS.maxRecords) return fail("Demo listing limit reached. Reset demo data to continue.");

  const listing: Listing = {
    id: ctx.newId(), companyId: me.id, materialId: material.id, title, description, quantity: input.quantity as number, unit: input.unit,
    quantityKg, pricePerKg: input.pricePerKg as number, cityId: location.id, location, quality: input.quality, moisturePct: moisture,
    contamination: input.contamination, availability: input.availability, imageDataUrl: image as string | null, status: "active", createdAt: ctx.now,
  };
  return { ok: true, value: { state: { ...state, listings: [listing, ...state.listings] }, listing } };
}

export function setListingStatus(state: AppState, listingId: string, status: Listing["status"]): Result<AppState> {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing || listing.companyId !== state.session?.companyId) return fail("Only the owner can change this listing.");
  return { ok: true, value: { ...state, listings: state.listings.map((l) => (l.id === listingId ? { ...l, status } : l)) } };
}

export type RequirementInput = {
  materialId: unknown; quantityKg: unknown; maxBudgetPerKg: unknown; cityId: unknown; location?: unknown; maxDistanceKm: unknown; minQuality: unknown;
  maxContamination: unknown; maxMoisturePct: unknown; delivery: unknown; notes: unknown;
};

export function addRequirement(state: AppState, input: RequirementInput, ctx: Ctx): Result<{ state: AppState; requirement: Requirement }> {
  const me = sessionCompany(state);
  if (!me) return fail("Sign in to publish requirements.");
  if (!me.roles.includes("consumer")) return fail("Only Waste Consumer accounts can publish requirements. Add the role in your profile.");
  if (!findMaterial(input.materialId as string)) return fail("Choose the material you need.");
  if (!isPositiveKg(input.quantityKg)) return fail("Quantity must be a positive number of kg.");
  if (!isPrice(input.maxBudgetPerKg)) return fail("Budget must be ₹0 or more per kg.");
  const location = findCity(input.cityId as string, input.location);
  if (!location) return fail("Choose a preferred location.");
  const radius = input.maxDistanceKm;
  if (typeof radius !== "number" || !Number.isFinite(radius) || radius < 1 || radius > 3000) return fail("Search radius must be 1–3,000 km.");
  if (!oneOf(QUALITY_GRADES, input.minQuality)) return fail("Choose a minimum quality.");
  if (!oneOf(CONTAMINATION_LEVELS, input.maxContamination)) return fail("Choose the maximum contamination.");
  const moisture = input.maxMoisturePct;
  if (moisture !== null && (typeof moisture !== "number" || !Number.isFinite(moisture) || moisture < 0 || moisture > 100)) return fail("Moisture limit must be 0–100% or blank.");
  if (!oneOf(DELIVERY, input.delivery)) return fail("Choose a delivery preference.");
  const notes = text(input.notes);
  if (notes.length > LIMITS.maxText) return fail("Notes are too long.");
  if (state.requirements.length >= LIMITS.maxRecords) return fail("Demo requirement limit reached.");

  const requirement: Requirement = {
    id: ctx.newId(), companyId: me.id, materialId: input.materialId as string, quantityKg: input.quantityKg as number,
    maxBudgetPerKg: input.maxBudgetPerKg as number, cityId: location.id, location, maxDistanceKm: radius, minQuality: input.minQuality,
    maxContamination: input.maxContamination, maxMoisturePct: moisture as number | null, delivery: input.delivery, notes, status: "open", createdAt: ctx.now,
  };
  return { ok: true, value: { state: { ...state, requirements: [requirement, ...state.requirements] }, requirement } };
}

export function setRequirementStatus(state: AppState, requirementId: string, status: Requirement["status"]): Result<AppState> {
  const requirement = state.requirements.find((r) => r.id === requirementId);
  if (!requirement || requirement.companyId !== state.session?.companyId) return fail("Only the owner can change this requirement.");
  return { ok: true, value: { ...state, requirements: state.requirements.map((r) => (r.id === requirementId ? { ...r, status } : r)) } };
}

export function toggleSaved(state: AppState, listingId: string): Result<{ state: AppState; saved: boolean }> {
  const me = state.session?.companyId;
  if (!me) return fail("Sign in to save listings.");
  if (!state.listings.some((l) => l.id === listingId)) return fail("Listing not found.");
  const current = state.savedListingIds[me] ?? [];
  const saved = !current.includes(listingId);
  const next = saved ? [...current, listingId] : current.filter((id) => id !== listingId);
  return { ok: true, value: { state: { ...state, savedListingIds: { ...state.savedListingIds, [me]: next } }, saved } };
}

// ---------- Deals: requests, negotiation, exchange tracking ----------

export const OPEN_STATUSES: readonly DealStatus[] = ["requested", "negotiating", "accepted", "in_transit"];

export type OfferInput = { quantityKg: unknown; pricePerKg: unknown; note: unknown };

function checkOffer(listing: Listing, input: OfferInput): string | null {
  if (!isPositiveKg(input.quantityKg)) return "Quantity must be a positive number of kg.";
  if ((input.quantityKg as number) > listing.quantityKg) return `Quantity cannot exceed the ${listing.quantityKg.toLocaleString("en-IN")} kg listed.`;
  if (!isPrice(input.pricePerKg)) return "Price must be ₹0 or more per kg, with up to 2 decimals.";
  if (text(input.note).length > LIMITS.maxText) return "Note is too long.";
  return null;
}

export function requestDeal(
  state: AppState,
  input: OfferInput & { listingId: string; requirementId: string | null },
  ctx: Ctx,
): Result<{ state: AppState; deal: Deal }> {
  const me = state.session?.companyId;
  if (!me) return fail("Sign in to contact sellers.");
  const listing = state.listings.find((l) => l.id === input.listingId);
  if (!listing || listing.status !== "active") return fail("This listing is no longer available.");
  if (listing.companyId === me) return fail("You can't send a request for your own listing.");
  if (input.requirementId !== null) {
    const requirement = state.requirements.find((r) => r.id === input.requirementId);
    if (!requirement || requirement.companyId !== me) return fail("That requirement belongs to another company.");
  }
  if (state.deals.some((d) => d.listingId === listing.id && d.buyerId === me && OPEN_STATUSES.includes(d.status))) {
    return fail("You already have an open request for this listing. Continue it in Negotiations.");
  }
  const offerError = checkOffer(listing, input);
  if (offerError) return fail(offerError);
  const deal: Deal = {
    id: ctx.newId(), listingId: listing.id, requirementId: input.requirementId, buyerId: me, sellerId: listing.companyId, status: "requested",
    offers: [{ id: ctx.newId(), byCompanyId: me, quantityKg: input.quantityKg as number, pricePerKg: input.pricePerKg as number, note: text(input.note), createdAt: ctx.now }],
    messages: text(input.note) ? [{ id: ctx.newId(), companyId: me, text: text(input.note), createdAt: ctx.now }] : [],
    history: [{ status: "requested", byCompanyId: me, at: ctx.now }], createdAt: ctx.now, updatedAt: ctx.now,
  };
  return { ok: true, value: { state: { ...state, deals: [deal, ...state.deals] }, deal } };
}

function withDeal(state: AppState, dealId: string, update: (deal: Deal, me: string, listing: Listing) => Deal | string): Result<AppState> {
  const me = state.session?.companyId;
  const deal = state.deals.find((d) => d.id === dealId);
  if (!me || !deal || (deal.buyerId !== me && deal.sellerId !== me)) return fail("Only the buyer or seller can update this exchange.");
  const listing = state.listings.find((l) => l.id === deal.listingId);
  if (!listing) return fail("Listing not found.");
  const next = update(deal, me, listing);
  if (typeof next === "string") return fail(next);
  return { ok: true, value: { ...state, deals: state.deals.map((d) => (d.id === dealId ? next : d)) } };
}

const lastOfferBy = (deal: Deal) => deal.offers[deal.offers.length - 1]?.byCompanyId;

function transition(deal: Deal, status: DealStatus, me: string, now: string): Deal {
  return { ...deal, status, history: [...deal.history, { status, byCompanyId: me, at: now }], updatedAt: now };
}

export function counterOffer(state: AppState, dealId: string, input: OfferInput, ctx: Ctx): Result<AppState> {
  return withDeal(state, dealId, (deal, me, listing) => {
    if (deal.status !== "requested" && deal.status !== "negotiating") return "Offers can only change before acceptance.";
    const error = checkOffer(listing, input);
    if (error) return error;
    const offer = { id: ctx.newId(), byCompanyId: me, quantityKg: input.quantityKg as number, pricePerKg: input.pricePerKg as number, note: text(input.note), createdAt: ctx.now };
    const next = { ...deal, offers: [...deal.offers, offer], updatedAt: ctx.now };
    return deal.status === "negotiating" ? next : transition(next, "negotiating", me, ctx.now);
  });
}

export function acceptDeal(state: AppState, dealId: string, ctx: Ctx): Result<AppState> {
  return withDeal(state, dealId, (deal, me) => {
    if (deal.status !== "requested" && deal.status !== "negotiating") return "This exchange can't be accepted now.";
    if (lastOfferBy(deal) === me) return "Waiting for the other party to respond to your offer.";
    return transition(deal, "accepted", me, ctx.now);
  });
}

export function rejectDeal(state: AppState, dealId: string, ctx: Ctx): Result<AppState> {
  return withDeal(state, dealId, (deal, me) => {
    if (deal.status !== "requested" && deal.status !== "negotiating") return "This exchange can't be rejected now.";
    if (lastOfferBy(deal) === me) return "You made the latest offer; withdraw it instead.";
    return transition(deal, "rejected", me, ctx.now);
  });
}

export function cancelDeal(state: AppState, dealId: string, ctx: Ctx): Result<AppState> {
  return withDeal(state, dealId, (deal, me) => {
    if (deal.status !== "requested" && deal.status !== "negotiating" && deal.status !== "accepted") return "This exchange can no longer be cancelled.";
    const refunded = deal.payment?.status === "held_in_escrow" ? { ...deal, payment: { ...deal.payment, status: "refunded" as const, settledAt: ctx.now } } : deal;
    return transition(refunded, "cancelled", me, ctx.now);
  });
}

/**
 * Prototype escrow payment by the buyer after acceptance. No money moves and no card or bank
 * details are collected; a real build would create the payment with a provider on the server.
 */
export function payForDeal(state: AppState, dealId: string, method: unknown, ctx: Ctx): Result<AppState> {
  return withDeal(state, dealId, (deal, me) => {
    if (deal.buyerId !== me) return "Only the buyer pays for an exchange.";
    if (deal.status !== "accepted") return "Payment opens once terms are accepted.";
    if (deal.payment) return "This exchange is already paid.";
    if (!oneOf(PAYMENT_METHODS, method)) return "Choose a payment method.";
    const last = deal.offers[deal.offers.length - 1];
    const amountInr = Math.round(last.quantityKg * last.pricePerKg * 100) / 100;
    const reference = `SYM-PAY-${ctx.newId().replace(/\W/g, "").slice(0, 10).toUpperCase()}`;
    return { ...deal, payment: { reference, method, amountInr, status: "held_in_escrow", paidAt: ctx.now, settledAt: null }, updatedAt: ctx.now };
  });
}

export function markDispatched(state: AppState, dealId: string, ctx: Ctx): Result<AppState> {
  return withDeal(state, dealId, (deal, me) => {
    if (deal.status !== "accepted") return "Only accepted exchanges can be dispatched.";
    if (deal.sellerId !== me) return "Only the seller marks material as dispatched.";
    if (deal.payment?.status !== "held_in_escrow") return "Wait for the buyer's payment to reach escrow before dispatching.";
    return transition(deal, "in_transit", me, ctx.now);
  });
}

export function markReceived(state: AppState, dealId: string, ctx: Ctx): Result<AppState> {
  return withDeal(state, dealId, (deal, me) => {
    if (deal.status !== "in_transit") return "Only dispatched exchanges can be marked received.";
    if (deal.buyerId !== me) return "Only the buyer confirms receipt.";
    const released = deal.payment?.status === "held_in_escrow" ? { ...deal, payment: { ...deal.payment, status: "released" as const, settledAt: ctx.now } } : deal;
    return transition(released, "completed", me, ctx.now);
  });
}

// ---------- Verification (prototype review) and notifications ----------

export function submitVerification(state: AppState, input: { gstin: unknown; documentName: unknown }, ctx: Ctx): Result<AppState> {
  const me = sessionCompany(state);
  if (!me) return fail("Sign in first.");
  if (me.verified) return fail("Your company is already verified.");
  if (me.verification?.status === "pending") return fail("A verification request is already under review.");
  const gstin = text(input.gstin).toUpperCase();
  if (!GSTIN_PATTERN.test(gstin)) return fail("Enter a valid 15-character GSTIN, e.g. 03ABCDE1234F1Z5.");
  const documentName = text(input.documentName);
  if (!documentName || documentName.length > 200) return fail("Attach your GST certificate or registration document.");
  const updated: Company = { ...me, verification: { status: "pending", gstin, documentName, submittedAt: ctx.now, reviewedAt: null } };
  return { ok: true, value: { ...state, companies: state.companies.map((c) => (c.id === me.id ? updated : c)) } };
}

/** Prototype stand-in for the SYMBIO team's document review. */
export function simulateVerificationReview(state: AppState, decision: "verified" | "rejected", ctx: Ctx): Result<AppState> {
  const me = sessionCompany(state);
  if (!me || me.verification?.status !== "pending") return fail("No pending verification request.");
  const updated: Company = { ...me, verified: decision === "verified", verification: { ...me.verification, status: decision, reviewedAt: ctx.now } };
  return { ok: true, value: { ...state, companies: state.companies.map((c) => (c.id === me.id ? updated : c)) } };
}

export function markNotificationsSeen(state: AppState, ctx: Ctx): Result<AppState> {
  const me = state.session?.companyId;
  if (!me) return fail("Sign in first.");
  return { ok: true, value: { ...state, notificationsSeenAt: { ...(state.notificationsSeenAt ?? {}), [me]: ctx.now } } };
}

export function sendMessage(state: AppState, dealId: string, body: unknown, ctx: Ctx): Result<AppState> {
  const message = text(body);
  if (!message) return fail("Write a message first.");
  if (message.length > LIMITS.maxText) return fail("Message is too long.");
  return withDeal(state, dealId, (deal, me) => ({
    ...deal, messages: [...deal.messages, { id: ctx.newId(), companyId: me, text: message, createdAt: ctx.now }], updatedAt: ctx.now,
  }));
}
