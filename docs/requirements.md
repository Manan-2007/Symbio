# Symbio requirements (three-hour prototype)

Scope comes from [`plan.md`](../plan.md). This file tracks what each block delivers.

## Phase mapping

| Phase | plan.md block | Status |
|---|---|---|
| **Phase 1 — foundation** | 0–15 min scaffold + 15–35 min types, fixtures, provider, persistence | **Done** |
| Phase 2 | 35–60 min marketplace filters + listing form | Done |
| Phase 3 | 60–110 min matching engine, Matches UI, enquiry action | Done (local scope; deployment optional) |
| Phase 4 | 110–180 min impact panel, polish, verification, optional deploy | Done (local scope; deployment optional) |

## Phase 1 deliverables and acceptance

- [x] Next.js 16 App Router, TypeScript strict, Tailwind; starts and builds without credentials.
- [x] Typed model (`Material`, `City`, `Business`, `Listing`, `Requirement`, `Enquiry`, `DemoState`).
- [x] Fixtures: 6 businesses, 6 listings, 3 requirements, 4 locality coordinates; unique IDs, valid references.
- [x] `DemoProvider`: hydrated state, `selectBusiness`, validated `addListing`, duplicate-safe `sendEnquiry`, `resetDemo`, `storageStatus`.
- [x] Versioned storage (`symbio-demo-v1`, `schemaVersion: 1`) with validation; loading, unavailable, corrupt and unsupported states.
- [x] Shell: title, demo notice, profile selector, Marketplace / Matches / Enquiries tabs, six listing cards, reset with confirmation.
- [x] Selected profile survives refresh; reset affects only Symbio's key.
- [x] No Supabase/Maps calls; `.env.example` with empty placeholders.

## Continuation delivered

- [x] Marketplace material/locality filters and clear action.
- [x] Inline listing form with bounds, precision, free price and material-specific declaration.
- [x] Exact-material matching, distance gate, stable scores/reasons and buyer selection.
- [x] Supplier listing → buyer fit → enquiry, duplicate protection and supplier visibility.
- [x] Carbon Offset Calculator with explicit fictional reuse records, scopes, ledger and what-if calculator.
- [x] Reuse validation: involved business, unique enquiry, positive quantity and cumulative supply/demand limits.
- [x] Phase 1 v1 data compatibility: absent ledger initializes empty without dropping existing records.
- [x] `start.sh` / `start.bat`, shared Node launcher, readiness check and existing-server reuse.
- [x] Updated plan, architecture, README and extended lightweight checks.

## Final prototype journey

1. Browse and filter fictional listings.
2. Add a listing as the selected supplier.
3. Switch to a buyer and choose its requirement.
4. See eligible ranked supply with reasons and potential impact.
5. Send an enquiry; supplier sees it after profile switching.
6. Explicitly record fictional reuse and view the carbon dashboard.
7. Refresh without losing listings, enquiries or reuse records.

## Supported values

- Materials: `sawdust`, `cotton_offcuts`, `cardboard` (exact-code matching only).
- Localities (synthetic points): Peenya 13.03/77.52, Yeshwanthpur 13.02/77.55, Whitefield 12.97/77.75, Bommasandra 12.82/77.69.

## Validation and persistence rules

- Enums must be recognised; business and listing IDs must exist.
- Quantity: finite, > 0, ≤ 1,000,000 kg, ≤ 3 decimals. Price: finite, ≥ 0, ≤ ₹1,000,000/kg, ≤ 2 decimals.
- Listings belong to the selected demo business and require the clean/untreated self-declaration.
- Enquiries: buyer = selected business and owns the requirement; same material; not a self-enquiry; quantity = `min(listing kg, required kg)` and ≥ requirement minimum; one per `(listingId, buyerBusinessId)`; status `sent`. Enquiries never reserve or subtract stock and never mean completion. Distance eligibility is checked again in the action. PaperLoop’s corrected radius is 25 km; Peenya is about 29.8 km from Bommasandra.
- Stored data is rejected as a whole if any record fails validation; it is never silently rewritten. Saving starts only after hydration. Storage exceptions fall back to memory with a visible warning.

## Non-goals and assumptions

No real auth, shared database, payments, uploads, chat, negotiation, reservations, road routing, Maps, LLM, verified carbon accounting or dark mode. All businesses and figures are fictional. One developer, one browser per demo; data is not shared between devices.

## Verification and remaining work

Automated checks cover fixtures, numeric bounds, storage failure/reset, legacy state loading, matching gates/ranking, action ownership and duplicates, and carbon ledger bounds/totals. Browser verification and build results are recorded in `docs/verification.md`.

Remaining: native Windows launcher smoke test (needs a Windows machine), optional Vercel deployment (needs the repository imported into a Vercel account; see `docs/deployment.md`), then a separately scoped shared-backend/authentication iteration (needs a Supabase project). Real carbon accounting requires reviewed factors and confirmed transfers.
