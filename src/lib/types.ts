// Data model from plan.md §5.1. Businesses, requirements and locality
// coordinates are static fixtures; only listings, enquiries and the selected
// demo profile live in DemoState.

export const MATERIALS = ["sawdust", "cotton_offcuts", "cardboard"] as const;
export type Material = (typeof MATERIALS)[number];

export const CITIES = ["Peenya", "Yeshwanthpur", "Whitefield", "Bommasandra"] as const;
export type City = (typeof CITIES)[number];

export type Business = {
  id: string;
  name: string;
  city: City;
};

export type Listing = {
  id: string;
  businessId: string;
  material: Material;
  quantityKg: number;
  pricePerKg: number; // INR; zero means free
  city: City;
  cleanUntreated: boolean; // self-declaration, not verification
  createdAt: string;
};

export type Requirement = {
  id: string;
  businessId: string;
  material: Material;
  requiredKg: number;
  minimumKg: number;
  maxDistanceKm: number;
  city: City;
};

export type Enquiry = {
  id: string;
  listingId: string;
  buyerBusinessId: string;
  quantityKg: number;
  createdAt: string;
  status: "sent";
};

export type Diversion = {
  id: string;
  enquiryId: string;
  quantityKg: number;
  createdAt: string;
};

export type DemoState = {
  schemaVersion: 1;
  selectedBusinessId: string;
  listings: Listing[];
  enquiries: Enquiry[];
  diversions: Diversion[]; // Explicitly recorded demo reuse, never inferred from an enquiry.
};

export type Coordinates = { lat: number; lng: number };

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
