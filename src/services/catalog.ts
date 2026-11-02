import type { Category, City, Contamination, Material, QualityGrade } from "./types";

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  wood: "Wood waste",
  textile: "Textile waste",
  plastic: "Plastic waste",
  metal: "Metal waste",
  organic: "Organic waste",
  paper: "Paper waste",
  construction: "Construction waste",
};

export const CATEGORY_BLURBS: Readonly<Record<Category, string>> = {
  wood: "Sawdust, chips and pallet offcuts for boards, fuel and growing media.",
  textile: "Cutting-room scraps for insulation, filling and recycled yarn.",
  plastic: "Sorted flakes and regrind for packaging and moulded goods.",
  metal: "Turnings and offcuts that return to the furnace.",
  organic: "Spent grounds and food residue for compost and biogas.",
  paper: "Clean cardboard and offcuts for pulp and packaging.",
  construction: "Rubble and aggregates for sub-base and fill.",
};

// Illustrative factors (kgCO2e avoided per kg reused vs landfill). Invented for the demo;
// replace with reviewed, material- and pathway-specific factors before any real reporting.
export const MATERIALS: readonly Material[] = [
  { id: "sawdust", name: "Sawdust", category: "wood", co2eFactor: 0.4, reuses: ["Mushroom substrate", "Particle board", "Biomass pellets", "Animal bedding"], industries: ["Agriculture", "Furniture", "Energy"] },
  { id: "wood_chips", name: "Wood chips", category: "wood", co2eFactor: 0.4, reuses: ["Mulch", "Biomass fuel", "Composting bulk"], industries: ["Landscaping", "Energy", "Agriculture"] },
  { id: "pallet_wood", name: "Pallet wood offcuts", category: "wood", co2eFactor: 0.45, reuses: ["Upcycled furniture", "Crates", "Chipping"], industries: ["Furniture", "Packaging"] },
  { id: "cotton_scraps", name: "Fabric scraps (cotton)", category: "textile", co2eFactor: 1.5, reuses: ["Recycled yarn", "Insulation batts", "Stuffing", "Paper pulp"], industries: ["Textile recycling", "Construction", "Home furnishing"] },
  { id: "polyester_scraps", name: "Polyester offcuts", category: "textile", co2eFactor: 1.2, reuses: ["Fibre fill", "Acoustic panels", "Non-wovens"], industries: ["Automotive", "Home furnishing"] },
  { id: "pet_flakes", name: "Recycled PET flakes", category: "plastic", co2eFactor: 1.2, reuses: ["Packaging", "Strapping", "Polyester fibre"], industries: ["Packaging", "Textile"] },
  { id: "hdpe_regrind", name: "HDPE regrind", category: "plastic", co2eFactor: 1.0, reuses: ["Pipes", "Crates", "Bins"], industries: ["Packaging", "Construction"] },
  { id: "plastic_film", name: "LDPE film scrap", category: "plastic", co2eFactor: 0.9, reuses: ["Garbage bags", "Plastic lumber"], industries: ["Packaging", "Construction"] },
  { id: "steel_turnings", name: "Steel turnings", category: "metal", co2eFactor: 1.6, reuses: ["Re-melting", "Briquetting"], industries: ["Steel", "Foundry"] },
  { id: "aluminium_scrap", name: "Aluminium offcuts", category: "metal", co2eFactor: 2.0, reuses: ["Secondary aluminium", "Die casting"], industries: ["Automotive", "Foundry"] },
  { id: "coffee_grounds", name: "Coffee grounds & organic waste", category: "organic", co2eFactor: 0.3, reuses: ["Compost", "Mushroom substrate", "Biogas"], industries: ["Agriculture", "Energy"] },
  { id: "food_waste", name: "Food processing residue", category: "organic", co2eFactor: 0.3, reuses: ["Compost", "Biogas", "Animal feed"], industries: ["Agriculture", "Energy"] },
  { id: "cardboard", name: "Cardboard offcuts", category: "paper", co2eFactor: 0.9, reuses: ["Recycled pulp", "Void fill", "Moulded pulp"], industries: ["Packaging", "Paper mills"] },
  { id: "paper_offcuts", name: "Paper trimmings", category: "paper", co2eFactor: 0.8, reuses: ["Recycled pulp", "Tissue", "Insulation"], industries: ["Paper mills", "Construction"] },
  { id: "concrete_rubble", name: "Concrete rubble", category: "construction", co2eFactor: 0.02, reuses: ["Road sub-base", "Recycled aggregate", "Fill"], industries: ["Construction", "Infrastructure"] },
];

/**
 * Partial substitutes, scored on the material axis (exact match = 1). Pairs not listed are
 * incompatible and are rejected outright, however good the price or distance.
 */
const SUBSTITUTES: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  sawdust: { wood_chips: 0.7 },
  wood_chips: { sawdust: 0.7, pallet_wood: 0.6 },
  pallet_wood: { wood_chips: 0.6 },
  cotton_scraps: { polyester_scraps: 0.6 },
  polyester_scraps: { cotton_scraps: 0.6 },
  coffee_grounds: { food_waste: 0.8 },
  food_waste: { coffee_grounds: 0.8 },
  cardboard: { paper_offcuts: 0.8 },
  paper_offcuts: { cardboard: 0.8 },
};

/** Material compatibility 0–1 for a supplied material against a required one. */
export function materialCompatibility(suppliedId: string, requiredId: string): number {
  if (suppliedId === requiredId) return 1;
  return SUBSTITUTES[requiredId]?.[suppliedId] ?? 0;
}

// Approximate city-centre coordinates. Distances derived from them are straight-line estimates.
export const CITIES: readonly City[] = [
  { id: "ludhiana", name: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573 },
  { id: "doraha", name: "Doraha", state: "Punjab", lat: 30.799, lng: 76.0244 },
  { id: "chandigarh", name: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { id: "mohali", name: "Mohali", state: "Punjab", lat: 30.7046, lng: 76.7179 },
  { id: "jalandhar", name: "Jalandhar", state: "Punjab", lat: 31.326, lng: 75.5762 },
  { id: "amritsar", name: "Amritsar", state: "Punjab", lat: 31.634, lng: 74.8723 },
  { id: "patiala", name: "Patiala", state: "Punjab", lat: 30.3398, lng: 76.3869 },
  { id: "gobindgarh", name: "Mandi Gobindgarh", state: "Punjab", lat: 30.6696, lng: 76.2984 },
  { id: "panipat", name: "Panipat", state: "Haryana", lat: 29.3909, lng: 76.9635 },
  { id: "delhi", name: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.209 },
];

export const QUALITY_LABELS: Readonly<Record<QualityGrade, string>> = {
  A: "Grade A · sorted, premium",
  B: "Grade B · standard",
  C: "Grade C · mixed",
};

export const CONTAMINATION_LABELS: Readonly<Record<Contamination, string>> = {
  none: "None",
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export function findMaterial(id: string): Material | undefined {
  return MATERIALS.find((m) => m.id === id);
}

export function findCity(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

export function materialName(id: string): string {
  return findMaterial(id)?.name ?? "Unknown material";
}

export function cityName(id: string): string {
  return findCity(id)?.name ?? "Unknown location";
}
