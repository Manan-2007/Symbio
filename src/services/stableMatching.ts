import type { AppState, Category, Listing, Requirement } from "./types";
import { findMaterial, materialName } from "./catalog";
import { evaluate, isMatch } from "./matchingEngine";
import type { Match } from "./matchingEngine";
import { trustScore } from "./analytics";

// Many-to-many barter pairing with the Gale-Shapley stable matching algorithm (proposer-optimal).
// Proposers are supply offerings; reviewers are counterparties with a material requirement.
// Each side ranks the other by compatibility, yield and trust; the result has no blocking pair.

export type BarterProposer = {
  id: string;
  label: string;
  ownerName: string;
  itemType: string; // material id
  quantity: number; // kg offered
  baseYieldValue: number; // usable output kg if the whole lot is upcycled
  preferences: string[]; // reviewer ids, best first
};

export type BarterReviewer = {
  id: string;
  ownerName: string;
  itemOffered: string; // what the counterparty makes from the material
  requiredItem: string; // material id
  requiredQty: number;
  estimatedYield: number; // usable output kg at its required quantity
  trustScore: number; // 0–100
  preferences: string[]; // proposer ids, best first
};

export type GaleShapleyResult = {
  /** proposer id → reviewer id, or null when the proposer exhausted its list. */
  matches: Record<string, string | null>;
  proposals: number;
};

/**
 * Deterministic Gale-Shapley, O(P × R). Free proposers propose in input order to their next
 * unvisited reviewer; a reviewer keeps the proposer it ranks higher and frees the other.
 * A reviewer never accepts a proposer that is absent from its own preference list.
 */
export function galeShapley(proposers: readonly BarterProposer[], reviewers: readonly BarterReviewer[]): GaleShapleyResult {
  const byId = new Map(proposers.map((p) => [p.id, p]));
  const rank = new Map(reviewers.map((r) => [r.id, new Map(r.preferences.map((pid, i) => [pid, i]))]));
  const nextChoice = new Map(proposers.map((p) => [p.id, 0]));
  const heldBy = new Map<string, string>(); // reviewer id → proposer id
  const free = proposers.map((p) => p.id);
  let proposals = 0;

  while (free.length > 0) {
    const pid = free.shift()!;
    const prefs = byId.get(pid)!.preferences;
    const i = nextChoice.get(pid)!;
    if (i >= prefs.length) continue; // exhausted: stays unmatched
    nextChoice.set(pid, i + 1);
    const rid = prefs[i];
    proposals++;
    const ranking = rank.get(rid);
    const candidate = ranking?.get(pid);
    if (candidate === undefined) { free.unshift(pid); continue; } // unacceptable to this reviewer
    const current = heldBy.get(rid);
    if (current === undefined) {
      heldBy.set(rid, pid);
    } else if (candidate < ranking!.get(current)!) {
      heldBy.set(rid, pid);
      free.push(current); // displaced proposer re-enters the queue
    } else {
      free.unshift(pid); // rejected: propose to the next choice
    }
  }

  const matches: Record<string, string | null> = Object.fromEntries(proposers.map((p) => [p.id, null]));
  for (const [rid, pid] of heldBy) matches[pid] = rid;
  return { matches, proposals };
}

/** True when no proposer and reviewer both prefer each other over their assigned partners. */
export function isStable(proposers: readonly BarterProposer[], reviewers: readonly BarterReviewer[], matches: Record<string, string | null>): boolean {
  const partnerOf = new Map<string, string>();
  for (const [pid, rid] of Object.entries(matches)) if (rid) partnerOf.set(rid, pid);
  const rRank = new Map(reviewers.map((r) => [r.id, new Map(r.preferences.map((pid, i) => [pid, i]))]));
  for (const p of proposers) {
    const mine = matches[p.id];
    const myIdx = mine ? p.preferences.indexOf(mine) : p.preferences.length;
    for (const rid of p.preferences.slice(0, myIdx)) {
      const ranking = rRank.get(rid);
      const pRank = ranking?.get(p.id);
      if (pRank === undefined) continue;
      const held = partnerOf.get(rid);
      if (held === undefined || pRank < ranking!.get(held)!) return false;
    }
  }
  return true;
}

// ---------- Building a barter market from SYMBIO data ----------

/** Illustrative recoverable fraction by category before quality penalties. */
const CATEGORY_YIELD: Readonly<Record<Category, number>> = {
  wood: 0.85, textile: 0.8, plastic: 0.9, metal: 0.93, organic: 0.6, paper: 0.88, construction: 0.7,
};
const CONTAMINATION_PENALTY = { none: 0, low: 0.03, moderate: 0.08, high: 0.15 } as const;

export function listingYieldRatio(listing: Listing): number {
  const category = findMaterial(listing.materialId)?.category;
  if (!category) return 0;
  const moisturePenalty = Math.min(0.2, Math.max(0, listing.moisturePct - 15) / 200);
  return Math.max(0, Math.round((CATEGORY_YIELD[category] - CONTAMINATION_PENALTY[listing.contamination] - moisturePenalty) * 1000) / 1000);
}

export type StablePair = {
  proposer: BarterProposer;
  reviewer: BarterReviewer;
  match: Match;
  usableKg: number;
  netYieldKg: number;
  yieldRatio: number;
  exchangeRatio: string; // "1 : 0.85"
  proposerChoice: number; // 1 = proposer's first choice
  reviewerChoice: number;
};

export type BarterMarket = {
  proposers: BarterProposer[];
  reviewers: BarterReviewer[];
  pairs: StablePair[];
  unmatched: BarterProposer[];
  proposals: number;
  stable: boolean;
};

/**
 * Proposers: active listings (plus an optional extra offer, e.g. the user's own byproduct).
 * Reviewers: open requirements. Only pairs that pass the matching engine's hard gates are ranked.
 */
export function buildBarterMarket(state: AppState, extraOffers: Listing[] = []): BarterMarket {
  const listings = [...extraOffers, ...state.listings.filter((l) => l.status === "active")];
  const requirements = state.requirements.filter((r) => r.status === "open");
  const owner = (id: string) => state.companies.find((c) => c.id === id)?.name ?? "Your company";
  const trust = (id: string) => (state.companies.some((c) => c.id === id) ? trustScore(state, id) : 70);

  const matrix = new Map<string, Match>(); // `${listingId}|${requirementId}`
  for (const l of listings) for (const r of requirements) {
    const m = evaluate(l, r);
    if (isMatch(m)) matrix.set(`${l.id}|${r.id}`, m);
  }
  const ratio = new Map(listings.map((l) => [l.id, listingYieldRatio(l)]));
  const reqTrust = new Map(requirements.map((r) => [r.id, trust(r.companyId)]));
  const supTrust = new Map(listings.map((l) => [l.id, trust(l.companyId)]));
  const reqYield = (r: Requirement, l: Listing) => Math.min(l.quantityKg, r.quantityKg) * (ratio.get(l.id) ?? 0);

  const proposers: BarterProposer[] = listings.map((l) => ({
    id: l.id,
    label: l.title,
    ownerName: extraOffers.includes(l) ? "Your offer" : owner(l.companyId),
    itemType: l.materialId,
    quantity: l.quantityKg,
    baseYieldValue: Math.round(l.quantityKg * (ratio.get(l.id) ?? 0)),
    preferences: requirements
      .filter((r) => matrix.has(`${l.id}|${r.id}`))
      .sort((a, b) => {
        const ma = matrix.get(`${l.id}|${a.id}`)!, mb = matrix.get(`${l.id}|${b.id}`)!;
        return mb.score - ma.score || reqYield(b, l) - reqYield(a, l) || reqTrust.get(b.id)! - reqTrust.get(a.id)! || a.id.localeCompare(b.id);
      })
      .map((r) => r.id),
  }));

  const reviewers: BarterReviewer[] = requirements.map((r) => ({
    id: r.id,
    ownerName: owner(r.companyId),
    itemOffered: findMaterial(r.materialId)?.reuses[0] ?? "Upcycled product",
    requiredItem: r.materialId,
    requiredQty: r.quantityKg,
    estimatedYield: Math.round(r.quantityKg * (CATEGORY_YIELD[findMaterial(r.materialId)?.category ?? "wood"] ?? 0.8)),
    trustScore: reqTrust.get(r.id)!,
    preferences: listings
      .filter((l) => matrix.has(`${l.id}|${r.id}`))
      .sort((a, b) => {
        const ma = matrix.get(`${a.id}|${r.id}`)!, mb = matrix.get(`${b.id}|${r.id}`)!;
        return mb.score - ma.score || supTrust.get(b.id)! - supTrust.get(a.id)! || reqYield(r, b) - reqYield(r, a) || a.id.localeCompare(b.id);
      })
      .map((l) => l.id),
  }));

  const { matches, proposals } = galeShapley(proposers, reviewers);
  const pById = new Map(proposers.map((p) => [p.id, p]));
  const rById = new Map(reviewers.map((r) => [r.id, r]));
  const pairs: StablePair[] = [];
  for (const [pid, rid] of Object.entries(matches)) {
    if (!rid) continue;
    const match = matrix.get(`${pid}|${rid}`)!;
    const y = ratio.get(pid) ?? 0;
    const p = pById.get(pid)!, r = rById.get(rid)!;
    pairs.push({
      proposer: p, reviewer: r, match,
      usableKg: match.usableKg,
      netYieldKg: Math.round(match.usableKg * y),
      yieldRatio: y,
      exchangeRatio: `1 : ${y.toFixed(2)}`,
      proposerChoice: p.preferences.indexOf(rid) + 1,
      reviewerChoice: r.preferences.indexOf(pid) + 1,
    });
  }
  pairs.sort((a, b) => b.match.score - a.match.score || a.proposer.id.localeCompare(b.proposer.id));
  return {
    proposers, reviewers, pairs,
    unmatched: proposers.filter((p) => !matches[p.id]),
    proposals,
    stable: isStable(proposers, reviewers, matches),
  };
}

export function describeOffer(p: BarterProposer): string {
  return `${materialName(p.itemType)} · ${Math.round(p.quantity).toLocaleString("en-IN")} kg`;
}
