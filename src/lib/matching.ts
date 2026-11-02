import { CITY_COORDINATES } from "./seed";
import type { Coordinates, Listing, Requirement } from "./types";
import { isCity, isValidQuantityKg } from "./validation";

export type Match = { listing: Listing; usableKg: number; distanceKm: number; score: number; reasons: string[] };

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function matchScore(usableKg: number, requiredKg: number, distanceKm: number, radiusKm: number): number {
  return Math.round(100 * (0.5 + 0.3 * Math.min(1, usableKg / requiredKg) + 0.2 * Math.max(0, 1 - distanceKm / radiusKm)));
}

export function matchListing(listing: Listing, requirement: Requirement): Match | null {
  if (listing.material !== requirement.material || listing.businessId === requirement.businessId || !listing.cleanUntreated ||
    !isValidQuantityKg(listing.quantityKg) || !isValidQuantityKg(requirement.requiredKg) ||
    !isValidQuantityKg(requirement.minimumKg) || !Number.isFinite(requirement.maxDistanceKm) || requirement.maxDistanceKm <= 0 ||
    !isCity(listing.city) || !isCity(requirement.city)) return null;
  const usableKg = Math.min(listing.quantityKg, requirement.requiredKg);
  const distanceKm = haversineKm(CITY_COORDINATES[listing.city], CITY_COORDINATES[requirement.city]);
  if (usableKg < requirement.minimumKg || distanceKm > requirement.maxDistanceKm) return null;
  return { listing, usableKg, distanceKm, score: matchScore(usableKg, requirement.requiredKg, distanceKm, requirement.maxDistanceKm),
    reasons: ["Exact material", `Covers ${Math.round(100 * usableKg / requirement.requiredKg)}% of requirement`, `About ${distanceKm.toFixed(1)} km away`] };
}

export function rankMatches(listings: readonly Listing[], requirement: Requirement): Match[] {
  return listings.flatMap((listing) => { const match = matchListing(listing, requirement); return match ? [match] : []; })
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.listing.id.localeCompare(b.listing.id)).slice(0, 5);
}
