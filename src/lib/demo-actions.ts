import { REQUIREMENTS, findBusiness } from "./seed";
import { matchListing } from "./matching";
import type { DemoState, Enquiry, Listing, Result } from "./types";
import {
  MAX_PRICE_PER_KG,
  MAX_QUANTITY_KG,
  PRICE_DECIMALS,
  QUANTITY_DECIMALS,
  isCity,
  isMaterial,
  isValidPricePerKg,
  isValidQuantityKg,
  usableKg,
  validateDemoState,
} from "./validation";

// Pure state transitions used by DemoProvider. IDs and timestamps are passed
// in so these stay deterministic and can be checked outside React.

export type NewListingInput = {
  material: unknown;
  quantityKg: unknown;
  pricePerKg: unknown;
  city: unknown;
  cleanUntreated: unknown;
};

export type EnquiryInput = {
  listingId: string;
  requirementId: string;
};

export function applySelectBusiness(state: DemoState, businessId: string): Result<DemoState> {
  if (!findBusiness(businessId)) return { ok: false, error: "Unknown demo business." };
  if (state.selectedBusinessId === businessId) return { ok: true, value: state };
  return { ok: true, value: { ...state, selectedBusinessId: businessId } };
}

/** Creates a listing owned by the currently selected demo business. */
export function applyAddListing(
  state: DemoState,
  input: NewListingInput,
  id: string,
  createdAt: string,
): Result<{ state: DemoState; listing: Listing }> {
  if (!findBusiness(state.selectedBusinessId)) return { ok: false, error: "Select a demo business first." };
  if (state.listings.length >= 1000) return { ok: false, error: "Demo listing limit reached. Reset the demo to start again." };
  if (!isMaterial(input.material)) return { ok: false, error: "Choose a supported material." };
  if (!isValidQuantityKg(input.quantityKg)) {
    return {
      ok: false,
      error: `Quantity must be greater than 0 and at most ${MAX_QUANTITY_KG.toLocaleString("en-IN")} kg, with up to ${QUANTITY_DECIMALS} decimal places.`,
    };
  }
  if (!isValidPricePerKg(input.pricePerKg)) {
    return {
      ok: false,
      error: `Price must be 0 or more and at most ₹${MAX_PRICE_PER_KG.toLocaleString("en-IN")} per kg, with up to ${PRICE_DECIMALS} decimal places.`,
    };
  }
  if (!isCity(input.city)) return { ok: false, error: "Choose one of the demo localities." };
  if (input.cleanUntreated !== true) {
    return { ok: false, error: "Confirm the material is clean, sorted and untreated to publish." };
  }
  if (state.listings.some((listing) => listing.id === id)) return { ok: false, error: "Listing ID collision; try again." };

  const listing: Listing = {
    id,
    businessId: state.selectedBusinessId,
    material: input.material,
    quantityKg: input.quantityKg,
    pricePerKg: input.pricePerKg,
    city: input.city,
    cleanUntreated: true,
    createdAt,
  };
  return { ok: true, value: { state: { ...state, listings: [...state.listings, listing] }, listing } };
}

/**
 * Records an enquiry from the selected business for one of its requirements.
 * Quantity is derived from current data, never taken from the caller.
 * Enquiries do not reserve or subtract stock.
 * Eligibility is checked again against current data before creating a record.
 */
export function applySendEnquiry(
  state: DemoState,
  input: EnquiryInput,
  id: string,
  createdAt: string,
): Result<{ state: DemoState; enquiry: Enquiry }> {
  const buyerBusinessId = state.selectedBusinessId;
  if (state.enquiries.length >= 1000) return { ok: false, error: "Demo enquiry limit reached." };
  const requirement = REQUIREMENTS.find((candidate) => candidate.id === input.requirementId);
  if (!requirement || requirement.businessId !== buyerBusinessId) {
    return { ok: false, error: "The selected business does not own this requirement." };
  }
  const listing = state.listings.find((candidate) => candidate.id === input.listingId);
  if (!listing) return { ok: false, error: "This listing no longer exists." };
  if (listing.businessId === buyerBusinessId) return { ok: false, error: "A business cannot enquire about its own listing." };
  if (listing.material !== requirement.material) return { ok: false, error: "Listing material does not match the requirement." };
  if (!listing.cleanUntreated) return { ok: false, error: "Listing lacks the clean/untreated declaration." };

  const quantityKg = usableKg(listing.quantityKg, requirement.requiredKg);
  if (!isValidQuantityKg(quantityKg) || quantityKg < requirement.minimumKg) {
    return { ok: false, error: `Available quantity is below the ${requirement.minimumKg} kg minimum.` };
  }
  if (!matchListing(listing, requirement)) return { ok: false, error: "This listing is outside the buyer’s radius or no longer eligible." };
  if (state.enquiries.some((e) => e.listingId === listing.id && e.buyerBusinessId === buyerBusinessId)) {
    return { ok: false, error: "Enquiry already sent for this listing." };
  }
  if (state.enquiries.some((e) => e.id === id)) return { ok: false, error: "Enquiry ID collision; try again." };

  const enquiry: Enquiry = { id, listingId: listing.id, buyerBusinessId, quantityKg, createdAt, status: "sent" };
  return { ok: true, value: { state: { ...state, enquiries: [...state.enquiries, enquiry] }, enquiry } };
}

/** Records a fictional reuse event separately from enquiry status. No inventory reservation is implied. */
export function applyRecordDiversion(state: DemoState, enquiryId: string, quantityKg: number, id: string, createdAt: string): Result<DemoState> {
  const enquiry = state.enquiries.find((e) => e.id === enquiryId);
  const listing = state.listings.find((l) => l.id === enquiry?.listingId);
  if (!enquiry || !listing || ![enquiry.buyerBusinessId, listing.businessId].includes(state.selectedBusinessId)) {
    return { ok: false, error: "Only an involved demo business can record reuse." };
  }
  if (state.diversions.some((d) => d.enquiryId === enquiryId)) return { ok: false, error: "Demo reuse already recorded." };
  const next = { ...state, diversions: [...state.diversions, { id, enquiryId, quantityKg, createdAt }] };
  if (!validateDemoState(next)) return { ok: false, error: "Enter positive kg within the enquiry, remaining original lot and buyer requirement (up to 3 decimals)." };
  return { ok: true, value: next };
}
