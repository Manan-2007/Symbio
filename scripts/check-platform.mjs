// Lightweight checks for the SYMBIO platform services (no test framework).
// Run with: pnpm check:platform  (compiles src/services to a temp dir first)
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const dir = resolve(process.argv[2]);
const load = (name) => require(`${dir}/${name}.js`);
const { createSeedState } = load("demoData");
const engine = load("matchingEngine");
const carbon = load("carbonCalculator");
const actions = load("actions");
const { validateAppState } = load("validation");
const { answerFromCatalogue, classifyMaterialImage } = load("ai");
const analytics = load("analytics");
const pw = load("password");
const { DEMO_PASSWORD } = load("demoData");
const creds = await pw.hashPassword("long-enough");
const H = { salt: creds.salt, passwordHash: creds.hash };

let n = 0;
let counter = 0;
const ctx = (now = "2026-11-02T10:00:00.000Z") => ({ newId: () => `id-${++counter}`, now });
const check = (name, fn) => { fn(); n++; };

const seed = createSeedState();

check("seed passes stored-state validation", () => assert.ok(validateAppState(JSON.parse(JSON.stringify(seed)))));

check("Green Furniture ↔ FreshGrow sample scores 97.5", () => {
  const listing = seed.listings.find((l) => l.id === "ls-sawdust-green");
  const req = seed.requirements.find((r) => r.id === "rq-freshgrow-sawdust");
  const m = engine.evaluate(listing, req);
  assert.ok(engine.isMatch(m), JSON.stringify(m));
  assert.equal(m.score, 97.5);
  assert.deepEqual([m.breakdown.material, m.breakdown.quantity, m.breakdown.price], [1, 1, 1]);
  assert.ok(Math.abs(m.distanceKm - 19.57) < 0.1);
});

check("incompatible material is rejected regardless of other factors", () => {
  const req = seed.requirements.find((r) => r.id === "rq-freshgrow-sawdust");
  const r = engine.evaluate(seed.listings.find((l) => l.id === "ls-cotton-eco"), req);
  assert.equal(engine.isMatch(r), false);
  assert.match(r.reason, /Incompatible/);
});

check("substitute scores below exact; quality/contamination/moisture/radius gates reject", () => {
  const base = seed.listings.find((l) => l.id === "ls-sawdust-green");
  const req = seed.requirements.find((r) => r.id === "rq-freshgrow-sawdust");
  const sub = engine.evaluate({ ...base, id: "x1", materialId: "wood_chips" }, req);
  assert.ok(engine.isMatch(sub) && sub.breakdown.material === 0.7 && sub.score < 97.5);
  for (const [patch, re] of [[{ quality: "C" }, /Quality/], [{ contamination: "high" }, /Contamination/], [{ moisturePct: 40 }, /Moisture/], [{ cityId: "delhi" }, /radius/]]) {
    const r = engine.evaluate({ ...base, id: "x2", ...patch }, req);
    assert.equal(engine.isMatch(r), false, JSON.stringify(patch));
    assert.match(r.reason, re);
  }
  assert.equal(engine.isMatch(engine.evaluate({ ...base, companyId: req.companyId }, req)), false, "same company");
});

check("price above budget lowers P but does not reject; partial quantity lowers Q", () => {
  const base = seed.listings.find((l) => l.id === "ls-sawdust-green");
  const req = seed.requirements.find((r) => r.id === "rq-freshgrow-sawdust");
  const pricey = engine.evaluate({ ...base, pricePerKg: 6 }, req);
  assert.ok(engine.isMatch(pricey) && Math.abs(pricey.breakdown.price - 0.8) < 1e-9 && pricey.cautions.length > 0);
  const small = engine.evaluate({ ...base, quantityKg: 200, quantity: 200 }, req);
  assert.ok(engine.isMatch(small) && small.breakdown.quantity === 0.5);
});

check("ranking is deterministic and descending", () => {
  const ms = engine.matchesForCompany("co-freshgrow", seed.listings, seed.requirements);
  assert.ok(ms.length >= 1);
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i - 1].score >= ms[i].score);
  assert.deepEqual(engine.parseMatchId(engine.matchId("a", "b")), { listingId: "a", requirementId: "b" });
});

check("carbon counts only completed exchanges with material factors", () => {
  const recs = carbon.impactRecords(seed);
  assert.equal(recs.length, seed.deals.filter((d) => d.status === "completed").length);
  assert.equal(carbon.estimateCo2eKg("sawdust", 400), 160);
  const t = carbon.impactTotals(recs);
  assert.ok(t.reusedKg > 0 && t.co2eKg > 0);
});

check("demo auth, registration validation, no password storage", () => {
  assert.equal(actions.findAccount(seed, "nobody@x.com"), undefined);
  assert.equal(actions.findAccount(seed, "OPS@greenfurniture.demo").companyId, "co-green-furniture");
  const bad = actions.register(seed, { companyName: "Acme", email: "acme@x.com", password: "short", industry: "Metal", cityId: "delhi", phone: "+91 98765 43210", roles: ["generator"], ...H }, ctx());
  assert.equal(bad.ok, false);
  const ok = actions.register(seed, { companyName: "Acme", email: "acme@x.com", password: "long-enough", industry: "Metal", cityId: "delhi", phone: "+91 98765 43210", roles: ["generator", "consumer"], ...H }, ctx());
  assert.ok(ok.ok);
  assert.ok(!JSON.stringify(ok.value).includes("long-enough"), "password must not be stored");
  assert.equal(actions.register(ok.value, { companyName: "Acme 2", email: "ACME@x.com", password: "long-enough", industry: "Metal", cityId: "delhi", phone: "+91 98765 43210", roles: ["generator"], ...H }, ctx()).ok, false, "duplicate email");
  assert.ok(validateAppState(JSON.parse(JSON.stringify(ok.value))));
});

check("registration requires a valid hash", () => {
  assert.equal(actions.register(seed, { companyName: "NoHash", email: "nh@x.com", password: "long-enough", industry: "Metal", cityId: "delhi", phone: "+91 98765 43210", roles: ["generator"] }, ctx()).ok, false);
});

check("listing and requirement creation validate and respect roles", () => {
  const asGreen = actions.loginAsCompany(seed, "co-green-furniture").value;
  const input = { materialId: "sawdust", title: "", description: "", quantity: 1.5, unit: "tonne", pricePerKg: 0, cityId: "ludhiana", quality: "A", moisturePct: 10, contamination: "none", availability: "weekly", imageDataUrl: null };
  const ok = actions.addListing(asGreen, input, ctx());
  assert.ok(ok.ok && ok.value.listing.quantityKg === 1500 && ok.value.listing.title === "Sawdust");
  for (const patch of [{ quantity: 0 }, { quantity: NaN }, { pricePerKg: -1 }, { materialId: "gold" }, { moisturePct: 120 }, { unit: "lb" }]) {
    assert.equal(actions.addListing(asGreen, { ...input, ...patch }, ctx()).ok, false, JSON.stringify(patch));
  }
  assert.equal(actions.addRequirement(asGreen, { materialId: "sawdust", quantityKg: 10, maxBudgetPerKg: 1, cityId: "ludhiana", maxDistanceKm: 50, minQuality: "B", maxContamination: "low", maxMoisturePct: null, delivery: "pickup", notes: "" }, ctx()).ok, false, "generator-only cannot publish requirements");
  assert.equal(actions.addListing(seed, input, ctx()).ok, false, "signed out");
});

check("deal lifecycle: request → counter → accept → dispatch → receive; impact only at completion", () => {
  let s = actions.loginAsCompany(seed, "co-freshgrow").value;
  const before = carbon.impactRecords(s).length;
  const req = actions.requestDeal(s, { listingId: "ls-sawdust-green", requirementId: "rq-freshgrow-sawdust", quantityKg: 400, pricePerKg: 3.5, note: "Weekly pickup?" }, ctx());
  assert.ok(req.ok);
  s = req.value.state;
  const id = req.value.deal.id;
  assert.equal(actions.requestDeal(s, { listingId: "ls-sawdust-green", requirementId: null, quantityKg: 10, pricePerKg: 4, note: "" }, ctx()).ok, false, "duplicate open request");
  assert.equal(actions.acceptDeal(s, id, ctx()).ok, false, "buyer cannot accept own offer");
  assert.equal(actions.requestDeal(s, { listingId: "ls-sawdust-green", requirementId: null, quantityKg: 9999, pricePerKg: 4, note: "" }, ctx()).ok, false);
  s = actions.loginAsCompany(s, "co-green-furniture").value;
  s = actions.counterOffer(s, id, { quantityKg: 400, pricePerKg: 4, note: "₹4 includes bagging" }, ctx()).value;
  assert.equal(s.deals.find((d) => d.id === id).status, "negotiating");
  assert.equal(actions.acceptDeal(s, id, ctx()).ok, false, "seller cannot accept own counter");
  s = actions.loginAsCompany(s, "co-freshgrow").value;
  s = actions.acceptDeal(s, id, ctx()).value;
  assert.equal(actions.markDispatched(s, id, ctx()).ok, false, "buyer cannot dispatch");
  assert.equal(carbon.impactRecords(s).length, before, "accepted ≠ completed");
  s = actions.loginAsCompany(s, "co-green-furniture").value;
  assert.equal(actions.markDispatched(s, id, ctx()).ok, false, "cannot dispatch before escrow payment");
  assert.equal(actions.payForDeal(s, id, "upi", ctx()).ok, false, "seller cannot pay");
  s = actions.loginAsCompany(s, "co-freshgrow").value;
  assert.equal(actions.payForDeal(s, id, "bitcoin", ctx()).ok, false, "unknown method");
  s = actions.payForDeal(s, id, "upi", ctx()).value;
  assert.equal(s.deals.find((d) => d.id === id).payment.status, "held_in_escrow");
  assert.equal(s.deals.find((d) => d.id === id).payment.amountInr, 1600);
  assert.equal(actions.payForDeal(s, id, "upi", ctx()).ok, false, "no double payment");
  s = actions.loginAsCompany(s, "co-green-furniture").value;
  s = actions.markDispatched(s, id, ctx()).value;
  s = actions.loginAsCompany(s, "co-freshgrow").value;
  s = actions.markReceived(s, id, ctx()).value;
  const deal = s.deals.find((d) => d.id === id);
  assert.equal(deal.status, "completed");
  assert.equal(deal.payment.status, "released", "escrow released on receipt");
  assert.equal(analytics.transactionValue(deal), 1600);
  assert.equal(carbon.impactRecords(s).length, before + 1);
  assert.equal(s.listings.find((l) => l.id === "ls-sawdust-green").quantityKg, 500, "no hidden inventory change");
  s = actions.sendMessage(s, id, "Thanks!", ctx()).value;
  assert.ok(validateAppState(JSON.parse(JSON.stringify(s))));
  const outsider = actions.loginAsCompany(s, "co-punjab-steel").value;
  assert.equal(actions.sendMessage(outsider, id, "hi", ctx()).ok, false, "non-party cannot message");
});

check("verification and notifications", () => {
  let s = actions.register(seed, { companyName: "Verify Co", email: "v@x.com", password: "long-enough", industry: "Metal", cityId: "delhi", phone: "+91 98765 43210", roles: ["generator"], ...H }, ctx()).value;
  assert.equal(actions.submitVerification(s, { gstin: "BAD", documentName: "gst.pdf" }, ctx()).ok, false);
  assert.equal(actions.submitVerification(s, { gstin: "03ABCDE1234F1Z5", documentName: "" }, ctx()).ok, false);
  s = actions.submitVerification(s, { gstin: "03abcde1234f1z5", documentName: "gst.pdf" }, ctx()).value;
  assert.equal(actions.submitVerification(s, { gstin: "03ABCDE1234F1Z5", documentName: "gst.pdf" }, ctx()).ok, false, "no duplicate pending");
  s = actions.simulateVerificationReview(s, "verified", ctx("2026-11-02T11:00:00.000Z")).value;
  const me = s.companies.find((c) => c.id === s.session.companyId);
  assert.ok(me.verified && me.verification.gstin === "03ABCDE1234F1Z5");
  assert.ok(validateAppState(JSON.parse(JSON.stringify(s))));
  const { notificationsFor } = load("notifications");
  const n1 = notificationsFor(s, me.id, "2026-11-02T12:00:00.000Z");
  assert.ok(n1.some((n) => n.kind === "verification" && n.unread));
  s = actions.markNotificationsSeen(s, ctx("2026-11-02T12:00:00.000Z")).value;
  assert.equal(notificationsFor(s, me.id, "2026-11-02T12:00:00.000Z").filter((n) => n.unread).length, 0);
  const green = notificationsFor(seed, "co-green-furniture", "2026-11-02T12:00:00.000Z");
  assert.ok(green.some((n) => n.kind === "payment") && green.some((n) => n.kind === "deal"));
});

check("cancel after payment refunds", () => {
  let s = actions.loginAsCompany(seed, "co-renew-packaging").value;
  const r = actions.requestDeal(s, { listingId: "ls-pet-polymer", requirementId: "rq-renew-pet", quantityKg: 100, pricePerKg: 30, note: "" }, ctx());
  s = r.value.state; const id = r.value.deal.id;
  s = actions.loginAsCompany(s, "co-polymer-reborn").value;
  s = actions.acceptDeal(s, id, ctx()).value;
  s = actions.loginAsCompany(s, "co-renew-packaging").value;
  s = actions.payForDeal(s, id, "neft", ctx()).value;
  s = actions.cancelDeal(s, id, ctx()).value;
  assert.equal(s.deals.find((d) => d.id === id).payment.status, "refunded");
});

check("stored-state validation rejects corruption", () => {
  const good = JSON.parse(JSON.stringify(seed));
  const bads = [
    { ...good, schemaVersion: 1 },
    { ...good, listings: [{ ...good.listings[0], pricePerKg: -3 }] },
    { ...good, listings: [{ ...good.listings[0], companyId: "co-missing" }] },
    { ...good, deals: [{ ...good.deals[0], sellerId: good.deals[0].buyerId }] },
    { ...good, session: { companyId: "nope" } },
    { ...good, savedListingIds: { "co-freshgrow": ["missing"] } },
    { ...good, companies: [...good.companies, good.companies[0]] },
    { ...good, deals: [{ ...good.deals[0], payment: { ...good.deals[0].payment, status: "stolen" } }] },
    { ...good, companies: [{ ...good.companies[0], verification: { status: "pending", gstin: "nope", documentName: "x", submittedAt: "2026-01-01", reviewedAt: null } }, ...good.companies.slice(1)] },
    { ...good, notificationsSeenAt: { "co-missing": "2026-01-01" } },
    null, [], "x",
  ];
  for (const b of bads) assert.equal(validateAppState(b), null);
});

check("assistant answers from catalogue; classifier is honest when unconfigured", () => {
  assert.ok(answerFromCatalogue("What can I do with sawdust?").materialIds.includes("sawdust"));
  assert.ok(answerFromCatalogue("Who purchases textile waste?").materialIds.includes("cotton_scraps"));
  assert.ok(answerFromCatalogue("Which industries use recycled plastic?").materialIds.includes("pet_flakes"));
  assert.equal(answerFromCatalogue("How can I find nearby buyers?").materialIds.length, 0);
  assert.equal(answerFromCatalogue("competitive pricing?").materialIds.length, 0, "no substring false positives");
});

// In Node the relative /api route is unreachable, which must surface as "unavailable", never a fake result.
const cls = await classifyMaterialImage("data:image/png;base64,AAAA");
assert.equal(cls.status, "unavailable");
n++;

const series = analytics.monthlySeries(carbon.impactRecords(seed), "2026-11-02T00:00:00.000Z");
assert.equal(series.length, 6);
assert.equal(series[0].month, "Jun");
n++;

// Gale-Shapley: textbook case with a known proposer-optimal stable result, plus displacement.
{
  const gs = load("stableMatching");
  const P = (id, prefs) => ({ id, label: id, ownerName: id, itemType: "sawdust", quantity: 1, baseYieldValue: 1, preferences: prefs });
  const R = (id, prefs) => ({ id, ownerName: id, itemOffered: "", requiredItem: "sawdust", requiredQty: 1, estimatedYield: 1, trustScore: 70, preferences: prefs });
  const props = [P("a", ["x", "y", "z"]), P("b", ["x", "z", "y"]), P("c", ["y", "x", "z"])];
  const revs = [R("x", ["b", "a", "c"]), R("y", ["a", "c", "b"]), R("z", ["c", "a", "b"])];
  const r = gs.galeShapley(props, revs);
  assert.deepEqual(r.matches, { a: "y", b: "x", c: "z" }, "a displaced from x by b, then a takes y and c moves to z");
  assert.ok(gs.isStable(props, revs, r.matches));
  assert.equal(gs.isStable(props, revs, { a: "x", b: "y", c: "z" }), false, "detects a blocking pair");
  const unacceptable = gs.galeShapley([P("a", ["x"])], [R("x", [])]);
  assert.equal(unacceptable.matches.a, null, "reviewers never accept proposers they did not rank");
  const market = gs.buildBarterMarket(seed);
  assert.ok(market.stable && market.pairs.length >= 3, "demo market produces a stable set of pairs");
  const ids = market.pairs.map((p) => p.reviewer.id);
  assert.equal(new Set(ids).size, ids.length, "each counterparty matched at most once");
  for (const p of market.pairs) assert.ok(p.netYieldKg > 0 && p.netYieldKg <= p.usableKg);
  n++;
}

// Credentials: demo hash matches the demo password; wrong passwords fail; stored hash never equals the password.
const greenAcct = seed.accounts.find((a) => a.companyId === "co-green-furniture");
assert.equal(await pw.verifyPassword(DEMO_PASSWORD, greenAcct), true);
assert.equal(await pw.verifyPassword("wrong-pass", greenAcct), false);
assert.equal(await pw.verifyPassword("long-enough", H), true);
assert.notEqual(creds.hash, "long-enough");
n++;

// Custom locations must survive every domain boundary without a catalogue entry.
const places = load("location");
const catalog = load("catalog");
const bengaluru = places.locationFromGeocode({ label: "Bengaluru, Karnataka, India", state: "Karnataka", lat: 12.9716, lng: 77.5946 });
const nearbyBengaluru = places.locationFromGeocode({ label: "Whitefield, Bengaluru, India", state: "Karnataka", lat: 12.9698, lng: 77.75 });
check("custom locations work in registration, profiles, listings, requirements and persisted state", () => {
  const registration = actions.register(seed, { companyName: "Bengaluru Materials", email: "bengaluru@example.test", password: "long-enough", industry: "Furniture", cityId: bengaluru.id, location: bengaluru, phone: "+91 98765 43210", roles: ["generator", "consumer"], ...H }, ctx());
  assert.ok(registration.ok);
  let s = registration.value;
  assert.equal(catalog.cityName(bengaluru.id, s.companies.at(-1).location), bengaluru.name);
  const profile = actions.updateProfile(s, { name: "Bengaluru Materials", industry: "Furniture", cityId: nearbyBengaluru.id, location: nearbyBengaluru, phone: "+91 98765 43210", description: "Custom location company", roles: ["generator", "consumer"], foundedYear: 2020 });
  assert.ok(profile.ok);
  s = profile.value;
  const listing = actions.addListing(s, { materialId: "sawdust", title: "Clean sawdust", description: "Untreated", quantity: 500, unit: "kg", pricePerKg: 4, cityId: bengaluru.id, location: bengaluru, quality: "A", moisturePct: 10, contamination: "none", availability: "weekly", imageDataUrl: null }, ctx());
  assert.ok(listing.ok);
  const requirement = actions.addRequirement(listing.value.state, { materialId: "sawdust", quantityKg: 400, maxBudgetPerKg: 5, cityId: nearbyBengaluru.id, location: nearbyBengaluru, maxDistanceKm: 50, minQuality: "B", maxContamination: "low", maxMoisturePct: 20, delivery: "either", notes: "" }, ctx());
  assert.ok(requirement.ok);
  const reloaded = validateAppState(JSON.parse(JSON.stringify(requirement.value.state)));
  assert.ok(reloaded);
  assert.deepEqual(reloaded.listings[0].location, bengaluru);
  assert.deepEqual(reloaded.requirements[0].location, nearbyBengaluru);
});
check("custom coordinates determine distance and radius eligibility", () => {
  const listing = { ...seed.listings[0], cityId: bengaluru.id, location: bengaluru };
  const requirement = { ...seed.requirements[0], cityId: nearbyBengaluru.id, location: nearbyBengaluru, maxDistanceKm: 50 };
  const result = engine.evaluate(listing, requirement);
  assert.ok(engine.isMatch(result));
  assert.ok(result.distanceKm > 15 && result.distanceKm < 20);
  assert.equal(engine.isMatch(engine.evaluate(listing, { ...requirement, maxDistanceKm: 5 })), false);
  assert.ok(result.reasons.some((r) => r.includes("Whitefield")));
});
check("malformed, missing and mismatched custom coordinates cannot enter saved state", () => {
  for (const location of [{ ...bengaluru, lat: 91 }, { ...bengaluru, lng: -181 }, { ...bengaluru, lat: "12" }, { ...bengaluru, lat: NaN }, { ...bengaluru, name: "" }, { ...bengaluru, id: "other" }, null]) {
    assert.equal(catalog.findCity(bengaluru.id, location), undefined);
    const s = structuredClone(seed);
    s.companies[0] = { ...s.companies[0], cityId: bengaluru.id, location };
    assert.equal(validateAppState(s), null);
  }
  assert.equal(catalog.findCity(bengaluru.id), undefined);
  assert.ok(validateAppState(JSON.parse(JSON.stringify(seed))), "legacy seed data still loads");
  assert.equal(places.locationFromGeocode({ label: "London", lat: Infinity, lng: 0 }), undefined);
});

console.log(`platform checks passed (${n})`);
