// Lightweight checks for the phase-1 data layer (no test framework).
// Run with: pnpm check:foundation  (compiles src/lib to a temp dir first)
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const dir = resolve(process.argv[2]);
const seed = require(`${dir}/seed.js`);
const validation = require(`${dir}/validation.js`);
const actions = require(`${dir}/demo-actions.js`);
const storage = require(`${dir}/storage.js`);

const now = "2026-11-02T10:00:00.000Z";
const s0 = seed.createSeedState();

// Fixtures
assert.equal(seed.BUSINESSES.length, 6);
assert.equal(s0.listings.length, 6);
assert.equal(seed.REQUIREMENTS.length, 3);
assert.equal(Object.keys(seed.CITY_COORDINATES).length, 4);
assert.equal(new Set([...seed.BUSINESSES, ...s0.listings, ...seed.REQUIREMENTS].map((r) => r.id)).size, 15);
assert.deepEqual(validation.validateDemoState(s0), s0, "seed must pass stored-data validation");
for (const r of seed.REQUIREMENTS) assert.ok(seed.findBusiness(r.businessId));

// addListing
const good = { material: "sawdust", quantityKg: 12.5, pricePerKg: 0, city: "Peenya", cleanUntreated: true };
const added = actions.applyAddListing(s0, good, "new-1", now);
assert.ok(added.ok);
assert.equal(added.value.listing.businessId, s0.selectedBusinessId);
for (const bad of [
  { quantityKg: 0 }, { quantityKg: -1 }, { quantityKg: NaN }, { quantityKg: Infinity }, { quantityKg: 1_000_001 },
  { quantityKg: 1.2345 }, { quantityKg: "5" }, { pricePerKg: -1 }, { pricePerKg: 1.234 }, { material: "steel" },
  { city: "Mumbai" }, { cleanUntreated: false },
]) {
  assert.equal(actions.applyAddListing(s0, { ...good, ...bad }, "x", now).ok, false, JSON.stringify(bad));
}

// sendEnquiry as PanelLoop
const asPanel = actions.applySelectBusiness(s0, "biz-panelloop").value;
const req = "req-panelloop-sawdust";
const e1 = actions.applySendEnquiry(asPanel, { listingId: "lst-cedarworks-sawdust-1000", requirementId: req }, "e1", now);
assert.ok(e1.ok);
assert.equal(e1.value.enquiry.quantityKg, 600);
assert.equal(e1.value.state.listings.find((l) => l.id === "lst-cedarworks-sawdust-1000").quantityKg, 1000, "no stock change");
const dup = actions.applySendEnquiry(e1.value.state, { listingId: "lst-cedarworks-sawdust-1000", requirementId: req }, "e2", now);
assert.equal(dup.ok, false, "duplicate blocked");
assert.equal(actions.applySendEnquiry(asPanel, { listingId: "lst-cedarworks-sawdust-50", requirementId: req }, "e3", now).ok, false, "below minimum");
assert.equal(actions.applySendEnquiry(asPanel, { listingId: "lst-boxworks-cardboard-2000", requirementId: req }, "e4", now).ok, false, "wrong material");
assert.equal(actions.applySendEnquiry(s0, { listingId: "lst-cedarworks-sawdust-1000", requirementId: req }, "e5", now).ok, false, "not requirement owner");
assert.equal(actions.applySelectBusiness(s0, "biz-nope").ok, false);

// Stored-state validation
const roundTrip = JSON.parse(JSON.stringify(e1.value.state));
assert.ok(validation.validateDemoState(roundTrip));
const corruptions = [
  { ...roundTrip, schemaVersion: 2 },
  { ...roundTrip, selectedBusinessId: "biz-x" },
  { ...roundTrip, listings: "nope" },
  { ...roundTrip, listings: [...roundTrip.listings, roundTrip.listings[0]] },
  { ...roundTrip, listings: [{ ...roundTrip.listings[0], quantityKg: -5 }] },
  { ...roundTrip, enquiries: [{ ...roundTrip.enquiries[0], listingId: "missing" }] },
  { ...roundTrip, enquiries: [{ ...roundTrip.enquiries[0], quantityKg: 9999 }] },
  { ...roundTrip, enquiries: [roundTrip.enquiries[0], { ...roundTrip.enquiries[0], id: "other" }] },
  null, [], 42,
];
for (const c of corruptions) assert.equal(validation.validateDemoState(c), null, JSON.stringify(c)?.slice(0, 80));

// Storage adapter with a fake window.localStorage
function withStorage(impl, fn) {
  globalThis.window = impl === "throws" ? Object.defineProperty({}, "localStorage", { get() { throw new Error("blocked"); } }) : { localStorage: impl };
  try { return fn(); } finally { delete globalThis.window; }
}
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => { throw new Error("clear() must not be called"); }, m }; };
const store = mem();
store.m.set("other-app", "keep");
withStorage(store, () => {
  assert.equal(storage.loadState().kind, "empty");
  assert.ok(storage.saveState(roundTrip));
  assert.deepEqual(storage.loadState(), { kind: "loaded", state: roundTrip });
  store.m.set(storage.STORAGE_KEY, "{not json");
  assert.equal(storage.loadState().kind, "corrupt");
  assert.equal(store.m.get(storage.STORAGE_KEY), "{not json", "load never overwrites");
  store.m.set(storage.STORAGE_KEY, JSON.stringify({ schemaVersion: 9 }));
  assert.equal(storage.loadState().kind, "unsupported");
  assert.ok(storage.clearState());
  assert.equal(store.m.has(storage.STORAGE_KEY), false);
  assert.equal(store.m.get("other-app"), "keep", "reset leaves other keys");
});
withStorage("throws", () => {
  assert.equal(storage.loadState().kind, "unavailable");
  assert.equal(storage.saveState(roundTrip), false);
});
withStorage({ getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem() {} }, () => {
  assert.equal(storage.saveState(roundTrip), false);
});

console.log("foundation checks passed");

// Matching gates, distance and stable ranking.
const matching = require(`${dir}/matching.js`);
const impact = require(`${dir}/impact.js`);
assert.equal(matching.haversineKm(seed.CITY_COORDINATES.Peenya, seed.CITY_COORDINATES.Peenya), 0);
const remoteDistance = matching.haversineKm(seed.CITY_COORDINATES.Peenya, seed.CITY_COORDINATES.Bommasandra);
assert.ok(remoteDistance > 25 && remoteDistance < 40, "remote cardboard fixture is outside the corrected 25 km radius");
assert.equal(matching.matchScore(600, 600, 10, 50), 96);
const panelRequirement = seed.REQUIREMENTS[0];
const lot = s0.listings[0];
assert.deepEqual(matching.rankMatches(s0.listings, panelRequirement).map((m) => m.listing.id), [lot.id]);
for (const changed of [{ businessId: panelRequirement.businessId }, { cleanUntreated: false }, { quantityKg: 50 }, { quantityKg: NaN }, { city: "invalid" }, { material: "cardboard" }]) {
  assert.equal(matching.matchListing({ ...lot, ...changed }, panelRequirement), null);
}
assert.equal(matching.matchListing(lot, { ...panelRequirement, maxDistanceKm: 0 }), null);
assert.equal(matching.matchListing(lot, { ...panelRequirement, maxDistanceKm: 1 }), null);
const tiedLots = [{ ...lot, id: "z" }, { ...lot, id: "a" }];
assert.deepEqual(matching.rankMatches(tiedLots, panelRequirement).map((m) => m.listing.id), ["a", "z"]);
const paperState = actions.applySelectBusiness(s0, "biz-paperloop").value;
assert.equal(actions.applySendEnquiry(paperState, { listingId: "lst-boxworks-cardboard-600", requirementId: "req-paperloop-cardboard" }, "remote", now).ok, false);

// Old phase-1 data upgrades without discarding any listings or enquiries.
const legacy = { ...e1.value.state };
delete legacy.diversions;
assert.deepEqual(validation.validateDemoState(legacy), e1.value.state);
assert.equal(impact.impactTotals(e1.value.state).avoidedKgCO2e, 0, "enquiries are not saved carbon");
assert.deepEqual(impact.calculateImpact(600, 2), { quantityKg: 600, valueINR: 1200, avoidedKgCO2e: 240 });
for (const invalid of [-1, NaN, Infinity]) assert.equal(impact.calculateImpact(invalid), null);
const reused = actions.applyRecordDiversion(e1.value.state, "e1", 600, "d1", now);
assert.ok(reused.ok);
assert.equal(impact.impactTotals(reused.value).avoidedKgCO2e, 240);
assert.equal(impact.impactTotals(reused.value, "biz-cedarworks").quantityKg, 600);
assert.equal(impact.impactTotals(reused.value, "biz-panelloop").quantityKg, 600);
assert.equal(impact.impactTotals(reused.value, "biz-stitchworks").quantityKg, 0);
assert.equal(actions.applyRecordDiversion(reused.value, "e1", 1, "d2", now).ok, false, "no duplicate reuse");
for (const invalid of [0, -1, 601, 1.1234, NaN]) assert.equal(actions.applyRecordDiversion(e1.value.state, "e1", invalid, "d2", now).ok, false);
const unrelated = { ...e1.value.state, selectedBusinessId: "biz-stitchworks" };
assert.equal(actions.applyRecordDiversion(unrelated, "e1", 100, "d3", now).ok, false);
assert.deepEqual(validation.validateDemoState(JSON.parse(JSON.stringify(reused.value))), reused.value);
assert.equal(validation.validateDemoState({ ...reused.value, diversions: [...reused.value.diversions, { ...reused.value.diversions[0], id: "duplicate" }] }), null);
// Two cotton enquiries overlap the same 300 kg demand: only 300 kg may be recorded.
const quilt = actions.applySelectBusiness(s0, "biz-quiltcycle").value;
const cotton1 = actions.applySendEnquiry(quilt, { listingId: "lst-stitchworks-cotton-500", requirementId: "req-quiltcycle-cotton" }, "c1", now).value.state;
const cotton2 = actions.applySendEnquiry(cotton1, { listingId: "lst-stitchworks-cotton-250", requirementId: "req-quiltcycle-cotton" }, "c2", now).value.state;
const partial = actions.applyRecordDiversion(cotton2, "c1", 200, "cd1", now).value;
assert.equal(actions.applyRecordDiversion(partial, "c2", 101, "cd2", now).ok, false);
assert.equal(actions.applyRecordDiversion(partial, "c2", 100, "cd2", now).ok, true);
console.log("matching, carbon ledger and phase-1 migration checks passed");
