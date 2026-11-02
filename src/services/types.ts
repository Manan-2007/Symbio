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

export const PAYMENT_METHODS = ["upi", "netbanking", "card", "neft"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Prototype escrow payment. No real money moves and no payment details are collected. */
export type Payment = {
  reference: string;
  method: PaymentMethod;
  amountInr: number;
  status: "held_in_escrow" | "released" | "refunded";
  paidAt: string;
  settledAt: string | null;
};

/** Prototype verification request. Only the GSTIN and the document's file name are kept. */
export type VerificationRequest = {
  status: "pending" | "verified" | "rejected";
  gstin: string;
  documentName: string;
  submittedAt: string;
  reviewedAt: string | null;
};

export type Review = { id: string; author: string; rating: number; text: string; date: string };

export type Company = {
  id: string;
  name: string;
  industry: string;
  cityId: string;
  /** Selected place and coordinates; absent on legacy seeded records. */
  location?: City;
  roles: Role[];
  description: string;
  email: string;
  phone: string;
  verified: boolean;
  foundedYear: number;
  reviews: Review[];
  isDemo: boolean;
  createdAt: string;
  verification?: VerificationRequest;
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
  /** Selected place and coordinates; absent on legacy seeded records. */
  location?: City;
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
  /** Selected place and coordinates; absent on legacy seeded records. */
  location?: City;
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
  payment?: Payment;
  createdAt: string;
  updatedAt: string;
};

/** Demo credentials kept in localStorage: salted PBKDF2-SHA256 hash, never the plain password. */
export type Account = { email: string; companyId: string; salt: string; passwordHash: string };

export type AppState = {
  schemaVersion: 2;
  session: { companyId: string } | null;
  accounts: Account[];
  companies: Company[];
  listings: Listing[];
  requirements: Requirement[];
  deals: Deal[];
  savedListingIds: Record<string, string[]>;
  /** Per company: notifications at or before this time are read. */
  notificationsSeenAt?: Record<string, string>;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
