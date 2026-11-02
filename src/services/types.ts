// Domain model for the SYMBIO platform. Pure types: no React, no browser APIs.

export const CATEGORIES = ["wood", "textile", "plastic", "metal", "organic", "paper", "construction"] as const;
export type Category = (typeof CATEGORIES)[number];

export const QUALITY_GRADES = ["A", "B", "C"] as const; // A = sorted premium, C = mixed
export type QualityGrade = (typeof QUALITY_GRADES)[number];

export const CONTAMINATION_LEVELS = ["none", "low", "moderate", "high"] as const;
export type Contamination = (typeof CONTAMINATION_LEVELS)[number];

export const UNITS = ["kg", "tonne"] as const;
export type Unit = (typeof UNITS)[number];

export const AVAILABILITY = ["immediate", "weekly", "monthly", "one_time"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const DELIVERY = ["pickup", "delivery", "either"] as const;
export type DeliveryPreference = (typeof DELIVERY)[number];

export const ROLES = ["generator", "consumer"] as const;
export type Role = (typeof ROLES)[number];

export const DEAL_STATUSES = ["requested", "negotiating", "accepted", "rejected", "in_transit", "completed", "cancelled"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export type Material = {
  id: string;
  name: string;
  category: Category;
  /** Illustrative kgCO2e avoided per kg reused instead of landfilled. Demo value, not certified. */
  co2eFactor: number;
  reuses: string[];
  industries: string[];
};

export type City = { id: string; name: string; state: string; lat: number; lng: number };

export type Review = { id: string; author: string; rating: number; text: string; date: string };

export type Company = {
  id: string;
  name: string;
  industry: string;
  cityId: string;
  roles: Role[];
  description: string;
  email: string;
  phone: string;
  verified: boolean;
  foundedYear: number;
  reviews: Review[];
  isDemo: boolean;
  createdAt: string;
};

export type Listing = {
  id: string;
  companyId: string;
  materialId: string;
  title: string;
  description: string;
  quantity: number;
  unit: Unit;
  quantityKg: number;
  pricePerKg: number; // INR
  cityId: string;
  quality: QualityGrade;
  moisturePct: number;
  contamination: Contamination;
  availability: Availability;
  imageDataUrl: string | null;
  status: "active" | "closed";
  createdAt: string;
};

export type Requirement = {
  id: string;
  companyId: string;
  materialId: string;
  quantityKg: number;
  maxBudgetPerKg: number;
  cityId: string;
  maxDistanceKm: number;
  minQuality: QualityGrade;
  maxContamination: Contamination;
  maxMoisturePct: number | null;
  delivery: DeliveryPreference;
  notes: string;
  status: "open" | "closed";
  createdAt: string;
};

export type Offer = { id: string; byCompanyId: string; quantityKg: number; pricePerKg: number; note: string; createdAt: string };
export type Message = { id: string; companyId: string; text: string; createdAt: string };
export type StatusEvent = { status: DealStatus; byCompanyId: string; at: string };

export type Deal = {
  id: string;
  listingId: string;
  requirementId: string | null;
  buyerId: string;
  sellerId: string;
  status: DealStatus;
  offers: Offer[];
  messages: Message[];
  history: StatusEvent[];
  createdAt: string;
  updatedAt: string;
};

export type Account = { email: string; companyId: string };

export type AppState = {
  schemaVersion: 2;
  session: { companyId: string } | null;
  accounts: Account[];
  companies: Company[];
  listings: Listing[];
  requirements: Requirement[];
  deals: Deal[];
  savedListingIds: Record<string, string[]>;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
