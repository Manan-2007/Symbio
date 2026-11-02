import type { AppState, Company, Deal, DealStatus, Listing, Requirement } from "./types";

// All companies, people, reviews and figures below are fictional demo data.

const T0 = "2026-04-01T09:00:00.000Z";

function company(c: Omit<Company, "isDemo" | "createdAt" | "reviews"> & { reviews?: Company["reviews"] }): Company {
  return { reviews: [], isDemo: true, createdAt: T0, ...c };
}

export const SEED_COMPANIES: readonly Company[] = [
  company({
    id: "co-green-furniture", name: "Green Furniture Ltd.", industry: "Furniture", cityId: "ludhiana", roles: ["generator"],
    description: "Solid-wood furniture workshop producing clean, untreated sawdust and offcuts every week.",
    email: "ops@greenfurniture.demo", phone: "+91 00000 10001", verified: true, foundedYear: 2009,
    reviews: [
      { id: "rv-1", author: "FreshGrow Mushroom Farm", rating: 5, text: "Consistent, dry sawdust. Pickup was easy to arrange.", date: "2026-09-12" },
      { id: "rv-2", author: "SoilRich Compost", rating: 4, text: "Good quality, occasional delays on weekends.", date: "2026-07-03" },
    ],
  }),
  company({
    id: "co-freshgrow", name: "FreshGrow Mushroom Farm", industry: "Agriculture", cityId: "doraha", roles: ["consumer"],
    description: "Oyster and button mushroom grower using hardwood sawdust as growing substrate.",
    email: "buying@freshgrow.demo", phone: "+91 00000 10002", verified: true, foundedYear: 2016,
    reviews: [{ id: "rv-3", author: "Green Furniture Ltd.", rating: 5, text: "Prompt payment and clear specifications.", date: "2026-09-14" }],
  }),
  company({
    id: "co-ecotextiles", name: "EcoTextiles Pvt. Ltd.", industry: "Textile", cityId: "chandigarh", roles: ["generator"],
    description: "Garment manufacturer with sorted cotton cutting-room scraps.",
    email: "sustainability@ecotextiles.demo", phone: "+91 00000 10003", verified: true, foundedYear: 2012,
    reviews: [{ id: "rv-4", author: "Threadloop Insulation", rating: 5, text: "Well-sorted by colour, very little contamination.", date: "2026-08-20" }],
  }),
  company({
    id: "co-renew-packaging", name: "ReNew Packaging", industry: "Packaging", cityId: "mohali", roles: ["consumer"],
    description: "Makes food-safe trays and strapping from recycled PET.",
    email: "procurement@renewpack.demo", phone: "+91 00000 10004", verified: true, foundedYear: 2018,
  }),
  company({
    id: "co-organic-earth", name: "Organic Earth", industry: "Organic recycling", cityId: "jalandhar", roles: ["generator", "consumer"],
    description: "Collects café and food-processing residue; supplies compost makers and buys bulking agents.",
    email: "hello@organicearth.demo", phone: "+91 00000 10005", verified: false, foundedYear: 2020,
  }),
  company({
    id: "co-punjab-steel", name: "Punjab Steel Works", industry: "Metal fabrication", cityId: "gobindgarh", roles: ["generator"],
    description: "CNC machining shop generating steel turnings for re-melting.",
    email: "scrap@punjabsteel.demo", phone: "+91 00000 10006", verified: true, foundedYear: 1998,
  }),
  company({
    id: "co-polymer-reborn", name: "Polymer Reborn", industry: "Plastic recycling", cityId: "ludhiana", roles: ["generator", "consumer"],
    description: "Washes and flakes post-industrial PET; buys clean film scrap.",
    email: "trade@polymerreborn.demo", phone: "+91 00000 10007", verified: true, foundedYear: 2015,
  }),
  company({
    id: "co-cartoncraft", name: "CartonCraft Industries", industry: "Paper & packaging", cityId: "amritsar", roles: ["generator"],
    description: "Corrugated box plant with daily cardboard trimmings.",
    email: "plant@cartoncraft.demo", phone: "+91 00000 10008", verified: false, foundedYear: 2011,
  }),
  company({
    id: "co-threadloop", name: "Threadloop Insulation", industry: "Textile recycling", cityId: "panipat", roles: ["consumer"],
    description: "Turns cotton and polyester scraps into thermal and acoustic insulation.",
    email: "sourcing@threadloop.demo", phone: "+91 00000 10009", verified: true, foundedYear: 2019,
  }),
  company({
    id: "co-soilrich", name: "SoilRich Compost", industry: "Agriculture", cityId: "patiala", roles: ["consumer"],
    description: "Commercial composting site supplying farms across Punjab.",
    email: "intake@soilrich.demo", phone: "+91 00000 10010", verified: true, foundedYear: 2017,
  }),
];

function listing(l: Omit<Listing, "quantityKg" | "imageDataUrl" | "status" | "createdAt"> & { createdAt?: string }): Listing {
  return { imageDataUrl: null, status: "active", createdAt: T0, ...l, quantityKg: l.unit === "tonne" ? l.quantity * 1000 : l.quantity };
}

export const SEED_LISTINGS: readonly Listing[] = [
  listing({ id: "ls-sawdust-green", companyId: "co-green-furniture", materialId: "sawdust", title: "Untreated hardwood sawdust", description: "Fine sawdust from sheesham and mango wood. Collected dust-free, bagged in 25 kg sacks.", quantity: 500, unit: "kg", pricePerKg: 4, cityId: "ludhiana", quality: "A", moisturePct: 12, contamination: "none", availability: "weekly" }),
  listing({ id: "ls-woodchips-green", companyId: "co-green-furniture", materialId: "wood_chips", title: "Mixed hardwood chips", description: "Chipped offcuts, 10–30 mm. Suitable for mulch or biomass.", quantity: 1.2, unit: "tonne", pricePerKg: 2.5, cityId: "ludhiana", quality: "B", moisturePct: 18, contamination: "low", availability: "monthly" }),
  listing({ id: "ls-cotton-eco", companyId: "co-ecotextiles", materialId: "cotton_scraps", title: "Sorted cotton fabric scraps", description: "Pre-consumer cotton cuttings sorted into light and dark shades.", quantity: 300, unit: "kg", pricePerKg: 6, cityId: "chandigarh", quality: "A", moisturePct: 5, contamination: "none", availability: "weekly" }),
  listing({ id: "ls-poly-eco", companyId: "co-ecotextiles", materialId: "polyester_scraps", title: "Polyester lining offcuts", description: "Mixed polyester lining trims, baled.", quantity: 180, unit: "kg", pricePerKg: 5, cityId: "chandigarh", quality: "B", moisturePct: 4, contamination: "low", availability: "monthly" }),
  listing({ id: "ls-coffee-organic", companyId: "co-organic-earth", materialId: "coffee_grounds", title: "Spent coffee grounds & café organics", description: "Collected daily from 40 cafés. Partially dewatered.", quantity: 800, unit: "kg", pricePerKg: 1.5, cityId: "jalandhar", quality: "B", moisturePct: 55, contamination: "low", availability: "immediate" }),
  listing({ id: "ls-steel-punjab", companyId: "co-punjab-steel", materialId: "steel_turnings", title: "Mild steel turnings", description: "Oil-drained turnings from CNC lathes.", quantity: 1.5, unit: "tonne", pricePerKg: 22, cityId: "gobindgarh", quality: "B", moisturePct: 2, contamination: "moderate", availability: "monthly" }),
  listing({ id: "ls-pet-polymer", companyId: "co-polymer-reborn", materialId: "pet_flakes", title: "Clear PET flakes (washed)", description: "Hot-washed post-industrial PET, 8–12 mm flakes.", quantity: 600, unit: "kg", pricePerKg: 30, cityId: "ludhiana", quality: "A", moisturePct: 1, contamination: "none", availability: "weekly" }),
  listing({ id: "ls-hdpe-polymer", companyId: "co-polymer-reborn", materialId: "hdpe_regrind", title: "Natural HDPE regrind", description: "Regrind from cap and closure production.", quantity: 400, unit: "kg", pricePerKg: 26, cityId: "ludhiana", quality: "B", moisturePct: 1, contamination: "low", availability: "monthly" }),
  listing({ id: "ls-cardboard-carton", companyId: "co-cartoncraft", materialId: "cardboard", title: "Corrugated cardboard trimmings", description: "Clean, dry die-cut waste from box production.", quantity: 900, unit: "kg", pricePerKg: 8, cityId: "amritsar", quality: "A", moisturePct: 8, contamination: "none", availability: "immediate" }),
  listing({ id: "ls-paper-carton", companyId: "co-cartoncraft", materialId: "paper_offcuts", title: "Kraft paper trimmings", description: "Unprinted kraft trims.", quantity: 350, unit: "kg", pricePerKg: 7, cityId: "amritsar", quality: "B", moisturePct: 7, contamination: "low", availability: "weekly" }),
];

function requirement(r: Omit<Requirement, "status" | "createdAt" | "notes"> & { notes?: string }): Requirement {
  return { notes: "", status: "open", createdAt: T0, ...r };
}

export const SEED_REQUIREMENTS: readonly Requirement[] = [
  requirement({ id: "rq-freshgrow-sawdust", companyId: "co-freshgrow", materialId: "sawdust", quantityKg: 400, maxBudgetPerKg: 5, cityId: "doraha", maxDistanceKm: 195, minQuality: "B", maxContamination: "low", maxMoisturePct: 20, delivery: "either", notes: "Untreated hardwood only; no MDF or painted wood." }),
  requirement({ id: "rq-renew-pet", companyId: "co-renew-packaging", materialId: "pet_flakes", quantityKg: 700, maxBudgetPerKg: 32, cityId: "mohali", maxDistanceKm: 150, minQuality: "A", maxContamination: "none", maxMoisturePct: 2, delivery: "delivery", notes: "Food-contact grade preferred." }),
  requirement({ id: "rq-threadloop-cotton", companyId: "co-threadloop", materialId: "cotton_scraps", quantityKg: 500, maxBudgetPerKg: 7, cityId: "panipat", maxDistanceKm: 250, minQuality: "B", maxContamination: "low", maxMoisturePct: 10, delivery: "either" }),
  requirement({ id: "rq-soilrich-organic", companyId: "co-soilrich", materialId: "food_waste", quantityKg: 1000, maxBudgetPerKg: 2, cityId: "patiala", maxDistanceKm: 200, minQuality: "C", maxContamination: "moderate", maxMoisturePct: null, delivery: "pickup" }),
  requirement({ id: "rq-organic-woodchips", companyId: "co-organic-earth", materialId: "wood_chips", quantityKg: 600, maxBudgetPerKg: 3, cityId: "jalandhar", maxDistanceKm: 120, minQuality: "C", maxContamination: "moderate", maxMoisturePct: null, delivery: "pickup", notes: "Bulking agent for compost windrows." }),
  requirement({ id: "rq-polymer-film", companyId: "co-polymer-reborn", materialId: "plastic_film", quantityKg: 800, maxBudgetPerKg: 15, cityId: "ludhiana", maxDistanceKm: 150, minQuality: "B", maxContamination: "low", maxMoisturePct: 3, delivery: "pickup" }),
];

// Historical exchanges so charts and transaction history have shape. Fictional.
function pastDeal(id: string, listingId: string, buyerId: string, sellerId: string, qty: number, price: number, date: string, status: DealStatus = "completed"): Deal {
  const day = (offset: number) => new Date(Date.parse(date) + offset * 86_400_000).toISOString();
  const history: Deal["history"] = [
    { status: "requested", byCompanyId: buyerId, at: day(0) },
    { status: "accepted", byCompanyId: sellerId, at: day(1) },
  ];
  if (status === "in_transit" || status === "completed") history.push({ status: "in_transit", byCompanyId: sellerId, at: day(3) });
  if (status === "completed") history.push({ status: "completed", byCompanyId: buyerId, at: day(5) });
  const payment: Deal["payment"] = {
    reference: `SYM-PAY-${id.replace(/\W/g, "").toUpperCase()}`, method: "upi", amountInr: qty * price,
    status: status === "completed" ? "released" : "held_in_escrow", paidAt: day(2), settledAt: status === "completed" ? day(5) : null,
  };
  return {
    id, listingId, requirementId: null, buyerId, sellerId, status,
    offers: [{ id: `${id}-o1`, byCompanyId: buyerId, quantityKg: qty, pricePerKg: price, note: "", createdAt: day(0) }],
    messages: [], history, payment, createdAt: day(0), updatedAt: history[history.length - 1].at,
  };
}

export const SEED_DEALS: readonly Deal[] = [
  pastDeal("dl-h01", "ls-sawdust-green", "co-freshgrow", "co-green-furniture", 350, 4, "2026-05-06T10:00:00.000Z"),
  pastDeal("dl-h02", "ls-cotton-eco", "co-threadloop", "co-ecotextiles", 260, 6, "2026-05-21T10:00:00.000Z"),
  pastDeal("dl-h03", "ls-coffee-organic", "co-soilrich", "co-organic-earth", 700, 1.5, "2026-06-09T10:00:00.000Z"),
  pastDeal("dl-h04", "ls-pet-polymer", "co-renew-packaging", "co-polymer-reborn", 500, 30, "2026-06-25T10:00:00.000Z"),
  pastDeal("dl-h05", "ls-sawdust-green", "co-freshgrow", "co-green-furniture", 400, 4, "2026-07-08T10:00:00.000Z"),
  pastDeal("dl-h06", "ls-cardboard-carton", "co-polymer-reborn", "co-cartoncraft", 450, 8, "2026-07-30T10:00:00.000Z"),
  pastDeal("dl-h07", "ls-woodchips-green", "co-organic-earth", "co-green-furniture", 600, 2.5, "2026-08-12T10:00:00.000Z"),
  pastDeal("dl-h08", "ls-cotton-eco", "co-threadloop", "co-ecotextiles", 300, 6, "2026-08-27T10:00:00.000Z"),
  pastDeal("dl-h09", "ls-sawdust-green", "co-freshgrow", "co-green-furniture", 420, 4, "2026-09-10T10:00:00.000Z"),
  pastDeal("dl-h10", "ls-coffee-organic", "co-soilrich", "co-organic-earth", 800, 1.5, "2026-09-24T10:00:00.000Z"),
  pastDeal("dl-h11", "ls-pet-polymer", "co-renew-packaging", "co-polymer-reborn", 600, 29, "2026-10-08T10:00:00.000Z"),
  pastDeal("dl-h12", "ls-steel-punjab", "co-polymer-reborn", "co-punjab-steel", 900, 22, "2026-10-22T10:00:00.000Z", "in_transit"),
];

/** Shared password for the fictional demo companies (shown on the login page). */
export const DEMO_PASSWORD = "demo1234";
// PBKDF2-SHA256, 100,000 iterations, of DEMO_PASSWORD with this salt (precomputed so seeding stays synchronous).
export const DEMO_SALT = "73796d62696f2d64656d6f2d73616c74";
export const DEMO_HASH = "4f0cf7a279f6ae34b8dd48292ac25b9849e1c0a01c67bd0f808948a585858409";

export const DEMO_ACCOUNTS = SEED_COMPANIES.map((c) => ({ email: c.email, companyId: c.id, salt: DEMO_SALT, passwordHash: DEMO_HASH }));

export function createSeedState(): AppState {
  const clone = <T,>(items: readonly T[]): T[] => items.map((item) => structuredClone(item));
  return {
    schemaVersion: 2,
    session: null,
    accounts: DEMO_ACCOUNTS.map((a) => ({ ...a })),
    companies: clone(SEED_COMPANIES),
    listings: clone(SEED_LISTINGS),
    requirements: clone(SEED_REQUIREMENTS),
    deals: clone(SEED_DEALS),
    savedListingIds: {},
  };
}
