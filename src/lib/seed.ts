import type { Business, City, Coordinates, DemoState, Listing, Material, Requirement } from "./types";

// All names and quantities are fictional (plan.md §10).

export const BUSINESSES: readonly Business[] = [
  { id: "biz-cedarworks", name: "CedarWorks", city: "Peenya" },
  { id: "biz-panelloop", name: "PanelLoop", city: "Yeshwanthpur" },
  { id: "biz-stitchworks", name: "StitchWorks", city: "Whitefield" },
  { id: "biz-quiltcycle", name: "QuiltCycle", city: "Whitefield" },
  { id: "biz-boxworks", name: "BoxWorks", city: "Bommasandra" },
  { id: "biz-paperloop", name: "PaperLoop", city: "Bommasandra" },
];

export const REQUIREMENTS: readonly Requirement[] = [
  {
    id: "req-panelloop-sawdust",
    businessId: "biz-panelloop",
    material: "sawdust",
    requiredKg: 600,
    minimumKg: 100,
    maxDistanceKm: 50,
    city: "Yeshwanthpur",
  },
  {
    id: "req-quiltcycle-cotton",
    businessId: "biz-quiltcycle",
    material: "cotton_offcuts",
    requiredKg: 300,
    minimumKg: 50,
    maxDistanceKm: 30,
    city: "Whitefield",
  },
  {
    id: "req-paperloop-cardboard",
    businessId: "biz-paperloop",
    material: "cardboard",
    requiredKg: 1500,
    minimumKg: 200,
    maxDistanceKm: 25,
    city: "Bommasandra",
  },
];

// Synthetic representative locality points, not real addresses (plan.md §7.2).
export const CITY_COORDINATES: Readonly<Record<City, Coordinates>> = {
  Peenya: { lat: 13.03, lng: 77.52 },
  Yeshwanthpur: { lat: 13.02, lng: 77.55 },
  Whitefield: { lat: 12.97, lng: 77.75 },
  Bommasandra: { lat: 12.82, lng: 77.69 },
};

export const MATERIAL_LABELS: Readonly<Record<Material, string>> = {
  sawdust: "Sawdust",
  cotton_offcuts: "Cotton offcuts",
  cardboard: "Cardboard",
};

const SEED_CREATED_AT = "2026-11-02T09:00:00.000Z";

const SEED_LISTINGS: readonly Listing[] = [
  { id: "lst-cedarworks-sawdust-1000", businessId: "biz-cedarworks", material: "sawdust", quantityKg: 1000, pricePerKg: 2, city: "Peenya", cleanUntreated: true, createdAt: SEED_CREATED_AT },
  { id: "lst-cedarworks-sawdust-50", businessId: "biz-cedarworks", material: "sawdust", quantityKg: 50, pricePerKg: 2, city: "Peenya", cleanUntreated: true, createdAt: SEED_CREATED_AT },
  { id: "lst-stitchworks-cotton-500", businessId: "biz-stitchworks", material: "cotton_offcuts", quantityKg: 500, pricePerKg: 8, city: "Whitefield", cleanUntreated: true, createdAt: SEED_CREATED_AT },
  { id: "lst-stitchworks-cotton-250", businessId: "biz-stitchworks", material: "cotton_offcuts", quantityKg: 250, pricePerKg: 8, city: "Peenya", cleanUntreated: true, createdAt: SEED_CREATED_AT },
  { id: "lst-boxworks-cardboard-2000", businessId: "biz-boxworks", material: "cardboard", quantityKg: 2000, pricePerKg: 4, city: "Bommasandra", cleanUntreated: true, createdAt: SEED_CREATED_AT },
  { id: "lst-boxworks-cardboard-600", businessId: "biz-boxworks", material: "cardboard", quantityKg: 600, pricePerKg: 4, city: "Peenya", cleanUntreated: true, createdAt: SEED_CREATED_AT },
];

export const DEFAULT_BUSINESS_ID = "biz-cedarworks";

export function createSeedState(): DemoState {
  return {
    schemaVersion: 1,
    selectedBusinessId: DEFAULT_BUSINESS_ID,
    listings: SEED_LISTINGS.map((listing) => ({ ...listing })),
    enquiries: [],
    diversions: [],
  };
}

export function findBusiness(id: string): Business | undefined {
  return BUSINESSES.find((business) => business.id === id);
}

export function businessName(id: string): string {
  return findBusiness(id)?.name ?? "Unknown business";
}

export function requirementsFor(businessId: string): Requirement[] {
  return REQUIREMENTS.filter((requirement) => requirement.businessId === businessId);
}
