# Symbio — basic working model in 3 hours

**Goal:** Build a small, working demonstration of a B2B by-product marketplace in **180 minutes**.  
**Plan revised:** 2 November 2026.  
**Team assumption:** One developer using an AI coding assistant.  
**Deliverable:** A running Next.js app that can list surplus materials, find compatible buyers, record an enquiry, and show clearly labeled illustrative impact.

This plan replaces the earlier 48-hour scope. Finish the complete basic flow first. Database integration, real accounts and logistics belong in the next iteration.

## Implementation status — 2 November 2026

Phase 1 from Claude Code is preserved. Phases 2–4 now implement marketplace filters and listing creation, deterministic matching, enquiries, and the requested **Carbon Offset Calculator** dashboard. The new dashboard adds explicit fictional reuse records; enquiries alone never count as landfill diversion. `start.sh` and `start.bat` launch locally and open the browser once ready, or reopen this project's existing dev server.

This is the continuation scope, beyond the original three-hour outline below. Optional public deployment and the shared-backend upgrade remain separate.

## 1. What must work at the end

The demo must let a user:

1. Open a marketplace populated with realistic **fictional** businesses and materials.
2. Add a surplus listing using a short form.
3. Switch to a buyer demo profile and select its material requirement.
4. See compatible supply ranked by material, quantity and approximate proximity.
5. Click **Send enquiry** and see it appear in an enquiries panel.
6. Refresh the browser without losing newly created listings or enquiries.
7. View estimated material value and an explicitly illustrative emissions scenario.
8. Explicitly record fictional reuse against an enquiry and see deduplicated landfill-diversion and illustrative CO₂e totals in the Carbon Offset Calculator.

**Success example:** CedarWorks lists 1,000 kg of untreated sawdust. PanelLoop needs 600 kg nearby. The app finds the listing, explains the match, and saves PanelLoop’s enquiry. The supplier sees that enquiry after switching profiles in the same browser.

This is a browser-local prototype: data is shared between demo profiles on the same browser, not between different devices. A deployed URL loads its own seed dataset in each visitor’s browser. State this clearly in the interface and presentation.

## 2. Strict scope

| Build now | Leave until after the three-hour model works |
|---|---|
| Seeded supplier and buyer demo profiles | Real signup, login, roles and organization onboarding |
| Add and browse surplus listings | Full listing editing, file uploads and moderation |
| Three supported materials | Large material catalog and automatic classification |
| Buyer requirement selector | Full demand-management workflow |
| Deterministic matching with explanations | AI, embeddings, advanced recommendations |
| Saved enquiries | Chat, negotiation, reservations, payments and fulfilment |
| Approximate distance using fixed city coordinates | Google Maps, address lookup and road routing |
| Carbon Offset Calculator: recorded demo diversion + scenario estimates | Verified carbon accounting, real transfer proof or offset credits |
| Browser persistence and reset demo button | Supabase, multi-user synchronization and production security |
| Basic responsive layout | Extensive animation and custom illustration |

**Do not add optional services during the timed build.** No Maps, email, LLM, storage bucket or database API key is needed. This removes setup dependencies and preserves time for a working demonstration.

## 3. Smallest useful technology stack

| Part | Choice |
|---|---|
| App | Next.js 16 App Router, TypeScript, compatible React version |
| Styling | Tailwind CSS from the Next.js scaffold |
| Interface | Native HTML inputs, selects, buttons and simple cards |
| State | React state through one `DemoProvider` |
| Persistence | Browser `localStorage`, versioned key `symbio-demo-v1` |
| Matching | Pure TypeScript functions |
| Distance | Haversine calculation using synthetic locality coordinates |
| Hosting | Optional Vercel deployment; local app remains the required deliverable |

Use already-installed compatible tooling where possible. Commit the package lockfile. Avoid installing component libraries, an ORM, form libraries, state-management libraries or chart libraries for this version.

**Why defer Supabase?** A correct shared database also needs authentication, ownership policies and migration testing. Those are useful next steps, but they are not necessary to demonstrate the core product in three hours. Do not simulate a shared backend by putting privileged keys in the client.

### 3.1 Setup

Prerequisites: a working supported Node installation, pnpm or npm, a code editor and internet access for the initial dependency install. Next.js documentation lists Node 20.9 as its minimum for this framework generation; use a supported installed Node LTS release.

```bash
pnpm create next-app@16 symbio --ts --tailwind --eslint --app --src-dir --import-alias '@/*'
cd symbio
pnpm dev
```

Choose default options for any remaining prompts. If using npm, use the equivalent `npx create-next-app@16` and `npm run dev`; do not switch package managers halfway through.

**Checkpoint:** The app opens at `http://localhost:3000` within the first 15 minutes. If scaffolding is slow, use a working existing Next.js starter rather than adding more tooling.

## 4. Four screens

Use a single page with four tabs: Marketplace, Matches, Enquiries, Carbon impact. This avoids extra routing and layout work.

### Marketplace

- Header: **Symbio — turn surplus into resources**.
- Persistent notice: **Demo · Fictional businesses · Data saved in this browser**.
- Profile selector: CedarWorks, PanelLoop, StitchWorks, QuiltCycle, BoxWorks, PaperLoop.
- Material filter and city filter; clear filters button.
- Cards with business name, material, available kg, city and price per kg.
- **Add listing** button opens a simple inline form.
- Card action: **Find buyer fit**, opening/selecting the Matches tab with the relevant listing where practical.

### Matches

- Buyer requirement selector, showing the selected buyer’s required material, kg and locality.
- Ranked compatible listing cards.
- Each card shows match score, usable quantity, straight-line distance and two or three reasons.
- **Send enquiry** button saves a fixed enquiry for the computed usable quantity.
- An enquiry success notice and link/tab to Enquiries.
- Small impact panel for the selected match with visible assumptions.

### Enquiries

- Show enquiries involving the selected business as buyer or supplier.
- Show material, requested kg, other business, date and status **Enquiry sent**.
- Empty state: “No enquiries yet. Find a match to start.”
- Enquiry status remains `sent`. A separate **Record demo reuse** action stores a fictional reuse quantity with an explicit confirmation checkbox. This is a simulation, not actual fulfilment. Each enquiry can be recorded once; partial quantities are allowed, but cumulative reuse cannot exceed the original listing or buyer material requirement.

### Carbon impact

- **Carbon Offset Calculator** dashboard with all-business and selected-business scopes.
- Recorded demo diversion (kg), illustrative CO₂e avoided, and reuse record count.
- A dated ledger and editable what-if quantity/factor calculator.
- Enquiries contribute zero until fictional reuse is explicitly recorded.
- Always display the assumption next to emissions values; no verified savings or carbon-credit claim.

**Required global states:** initial loading, empty results, invalid form, storage unavailable, and enquiry already sent. Use an inline message area rather than adding a toast package.

## 5. Data model and file layout

### 5.1 TypeScript types

```ts
type Material = 'sawdust' | 'cotton_offcuts' | 'cardboard';
type City = 'Peenya' | 'Yeshwanthpur' | 'Whitefield' | 'Bommasandra';

type Business = {
  id: string;
  name: string;
  city: City;
};

type Listing = {
  id: string;
  businessId: string;
  material: Material;
  quantityKg: number;
  pricePerKg: number; // INR; zero means free
  city: City;
  cleanUntreated: boolean; // self-declaration, not verification
  createdAt: string;
};

type Requirement = {
  id: string;
  businessId: string;
  material: Material;
  requiredKg: number;
  minimumKg: number;
  maxDistanceKm: number;
  city: City;
};

type Enquiry = {
  id: string;
  listingId: string;
  buyerBusinessId: string;
  quantityKg: number;
  createdAt: string;
  status: 'sent';
};

type Diversion = {
  id: string;
  enquiryId: string;
  quantityKg: number;
  createdAt: string;
};

type DemoState = {
  schemaVersion: 1;
  selectedBusinessId: string;
  listings: Listing[];
  enquiries: Enquiry[];
  diversions: Diversion[];
};
```

Use `crypto.randomUUID()` for new records. Businesses and buyer requirements are static fixtures. The selected business determines listing ownership; never ask the user to type arbitrary business IDs.

### 5.2 Files

```text
src/app/page.tsx                  # tabs and page composition
src/app/globals.css               # theme and small style additions
src/components/demo-provider.tsx  # shared state, load/save/reset
src/components/listing-form.tsx
src/components/marketplace.tsx
src/components/matches.tsx
src/components/enquiries.tsx
src/components/carbon-dashboard.tsx
src/lib/types.ts
src/lib/seed.ts                   # businesses, requirements, initial lots
src/lib/matching.ts               # gates, distance, scoring
src/lib/impact.ts                 # scenario math + recorded demo totals
src/lib/storage.ts                # safe load/save and validation
```

Do not split every small UI element into its own file. Keep matching and persistence separate from JSX so they can be checked independently.

### 5.3 Persistence behavior

1. Render a loading state until the client mounts; do not read `window` during server rendering.
2. Read `symbio-demo-v1` in a client effect. Validate schema version and the shape/bounds of stored records.
3. If no saved state exists, initialize seed data. If stored data is corrupt, show a message and offer a reset.
4. Save only **after hydration finishes**, so the initial render does not overwrite saved data.
5. Catch storage/quota exceptions. Continue with in-memory state and show “Changes cannot be saved in this browser.”
6. Old Phase 1 v1 records without `diversions` load with an empty ledger; present but invalid ledger data is rejected. Validate record references, unique IDs/enquiries and cumulative supply/demand bounds using integer grams.
7. Reset demo replaces only the Symbio storage key and application state. It must not call `localStorage.clear()`.

No personal information, addresses, passwords or sensitive business records belong in this prototype. Demo profile switching provides a story, not access control.

## 6. Short listing form

Required inputs:

- Material: one of the three supported options.
- Quantity: numeric kg, greater than zero, maximum 1,000,000; up to three decimal places.
- Price: INR/kg, zero or greater, maximum 1,000,000; up to two decimal places.
- Locality: one of the four fixed demo localities.
- Checkbox: “This material is clean, sorted and untreated.”

For sawdust the checkbox includes untreated wood; for cotton, clean sorted cotton; for cardboard, clean dry cardboard. Explain this is a supplier declaration.

Validation: reject empty numbers before conversion, `NaN`, infinity, negatives, out-of-range values and invalid enum values. Quantity zero is invalid; price zero is valid. For this restricted prototype, require the declaration to publish. Save against the selected business, update the marketplace immediately, clear the form and show success.

Do not collect photos, registration documents, expiry schedules, chemical analyses or transport quotes in this version.

## 7. Matching that can be implemented in 20 minutes

### 7.1 Eligibility gates

Before scoring, require:

1. Same material code as the selected requirement.
2. Supplier and buyer are different businesses.
3. Listing has the clean/untreated declaration.
4. Positive valid quantity and a recognized locality.
5. `usableKg = min(listing.quantityKg, requirement.requiredKg)` is at least `requirement.minimumKg`.
6. Approximate straight-line distance is within the buyer’s maximum radius.

Do not use material-name fuzzy matching. All three materials match only their identical material code. A high distance or quantity score cannot override incompatible material.

### 7.2 Distance and scoring

Use these **synthetic representative locality points**, not precise customer addresses:

| Locality | Latitude | Longitude |
|---|---:|---:|
| Peenya | 13.03 | 77.52 |
| Yeshwanthpur | 13.02 | 77.55 |
| Whitefield | 12.97 | 77.75 |
| Bommasandra | 12.82 | 77.69 |

Calculate Haversine distance with Earth radius 6,371 km and radians. Show the result as **approximate straight-line distance**; no road routing is implied.

```text
quantityFit = usableKg / requiredKg
distanceFit = max(0, 1 - distanceKm / maxDistanceKm)
score = round(100 × (0.50 + 0.30 × quantityFit + 0.20 × distanceFit))
```

The constant 0.50 reflects exact material compatibility after gates pass. Require positive `requiredKg` and `maxDistanceKm` before calculation.

Example: buyer needs 600 kg; listing has 1,000 kg; distance is 10 km; radius is 50 km. Quantity fit = 1, distance fit = 0.8, score = **96/100**. Label as “Match score,” never a success probability.

Sort by score descending, distance ascending, then listing ID for deterministic ties. Show at most five cards. Reasons: “Exact material,” “Covers 100% of requirement,” “About 10 km away.”

### 7.3 Enquiry rules

- Only the business owning the selected requirement can send its enquiry.
- Compute requested quantity from the current listing and requirement; do not trust stale card values.
- Prevent duplicate `(listingId,buyerBusinessId)` enquiries; disable the button after sending.
- Do not reduce available quantity: an enquiry is not a reservation.
- Do not simulate transport completion or saved carbon when the enquiry is sent.

## 8. Carbon Offset Calculator and value panel

The dashboard reports **estimated CO₂e avoidance under an illustrative landfill-versus-reuse scenario**. Its product title is Carbon Offset Calculator, but it does not issue credits or establish verified real-world offsets.

### Match-level potential

```text
potentialReuseKg = min(listing.quantityKg, requirement.requiredKg)
indicativePurchaseValueINR = potentialReuseKg × pricePerKg
potentialAvoidedKgCO2e = potentialReuseKg × 0.4
```

Never sum overlapping match or enquiry quantities as completed impact. ₹1,200 for 600 kg at ₹2/kg is indicative purchase value, not savings or profit.

### Recorded demo landfill diversion

1. Send an enquiry through the existing flow.
2. From Enquiries, an involved buyer or supplier opens **Record demo reuse**.
3. Enter the fictional reused kg and explicitly acknowledge it is demo data.
4. Validate positive finite kg (up to three decimals), enquiry ownership, one record per enquiry, and total reuse no greater than the original supply lot or buyer's material requirement. Use integer grams for cumulative bounds.
5. Persist the record alongside the existing v1 state. Old Phase 1 records load with an empty ledger; reset clears this ledger with the rest of Symbio data.
6. Dashboard totals sum each reuse record exactly once. Both parties may view it, but the all-business total never counts it twice. A new enquiry by itself changes no carbon total and reserves no inventory.

```text
recordedDemoDiversionKg = sum(unique reuse records.quantityKg)
illustrativeAvoidedKgCO2e = recordedDemoDiversionKg × 0.4
```

The dashboard has all-business / selected-business scopes, three summary tiles, a dated reuse ledger, an empty state, and an independent what-if calculator. The calculator defaults to 600 kg and 0.4 kgCO₂e/kg, producing 240 kgCO₂e. Its inputs do not modify the ledger or dashboard factor.

**Factor:** 0.4 kgCO₂e/kg is an invented demonstration assumption shared by all materials, not an EPA factor or measured result. Display:

> Illustrative scenario only. Assumes 0.4 kgCO₂e avoided per kg reused instead of landfilled. Actual impacts depend on disposal, processing and transport, which this model does not calculate. Not verified carbon offsets.

Real emissions reporting later requires confirmed transfers, reviewed material/pathway factors, geography, units, baseline and reuse boundaries, transport/processing treatment, provenance and methodology versions. Until then, keep every emissions result explicitly illustrative. Do not present fictional reuse as actual saved CO₂.

## 9. Minimal design system

**Direction:** Clean, practical B2B interface; readable cards and obvious actions.

| Item | Choice |
|---|---|
| Background | `#F7F8F5` |
| Cards | White |
| Primary buttons | `#166534` with white text |
| Primary text | `#17251C` |
| Secondary text | `#526158` |
| Border | `#D7DED8` |
| Demo/review notice | `#FEF3C7` background, `#92400E` text |
| Error text | `#B91C1C` |
| Typography | System sans-serif; 16px body, 28–32px page title |
| Layout | Maximum 1,100px; 16px mobile gutters; 3/2/1 column cards |
| Components | 12px card corners, 20px padding, 44px minimum button height |

Use visible labels and focus rings. Buttons and inputs must work with a keyboard. Status uses text as well as color. Use text/emoji material indicators or simple CSS shapes; asset sourcing is unnecessary. Skip dark mode, charts, complex animation and custom branding.

## 10. Seed dataset

Start with six businesses and six listings. All names and quantities are fictional.

| Business | Role | Locality | Initial supply / requirement |
|---|---|---|---|
| CedarWorks | Supplier | Peenya | 1,000 kg sawdust, ₹2/kg |
| PanelLoop | Buyer | Yeshwanthpur | Needs 600 kg sawdust; minimum 100 kg; radius 50 km |
| StitchWorks | Supplier | Whitefield | 500 kg cotton offcuts, ₹8/kg |
| QuiltCycle | Buyer | Whitefield | Needs 300 kg cotton; minimum 50 kg; radius 30 km |
| BoxWorks | Supplier | Bommasandra | 2,000 kg cardboard, ₹4/kg |
| PaperLoop | Buyer | Bommasandra | Needs 1,500 kg cardboard; minimum 200 kg; radius 25 km |

Additional three lots: CedarWorks 50 kg sawdust (below PanelLoop minimum), StitchWorks 250 kg cotton in Peenya (second candidate), BoxWorks 600 kg cardboard in Peenya (about 29.8 km away, outside the corrected 25 km PaperLoop radius; the earlier 40 km assumption did not exclude it).

Keep the initial enquiries empty. The demo creates one. Derive display names from business IDs rather than duplicating business names throughout state.

## 11. The 180-minute execution schedule

Stop each phase at its deadline. Fix core blockers before starting optional work.

| Minutes | Task | Dependency | Acceptance criterion |
|---|---|---|---|
| 0–15 | Scaffold app, start locally, replace starter content | Node and package install | Browser shows Symbio heading; no runtime error |
| 15–35 | Add types, fixtures, provider and persistence | Scaffold | Six listings render; selected profile and state survive refresh |
| 35–60 | Marketplace, filters, listing form | State/types | Valid submission adds a listing; invalid inputs blocked; refresh retains it |
| 60–85 | Gates, Haversine, scoring, buyer selector | Fixtures | Correct material matches; same-business, too-small and out-of-radius lots excluded |
| 85–110 | Matches UI and enquiry action/panel | Matching/state | Buyer sends one enquiry; supplier sees it after profile switch; duplicate blocked |
| 110–125 + continuation | Impact/value panel and Carbon Offset Calculator | Matching/enquiries | Explicit demo reuse records, no duplicate impact, visible assumptions |
| 125–145 | Responsive styling, empty/error states | End-to-end flow | Usable at 360px and desktop; clear loading/validation/storage messages |
| 145–165 | Verify flow, fix bugs, production build | Core finished | Checklist below passes; no hydration/storage crash; lint/build pass |
| 165–180 | Optional deployment, README and rehearsal | Passing build | Deployed URL if account ready; otherwise fully working local demo plus clear run instructions |

### Hard checkpoints

- **Minute 60:** Must be able to add and persist a listing. If not, stop styling and fix it.
- **Minute 110:** Must be able to match and send an enquiry. Cut impact work if needed.
- **Minute 145:** Feature freeze. Fix and verify only.
- **Minute 165:** If hosting setup is blocked, preserve the local demo. Do not spend the remaining time opening new service accounts.

**Priority order:** listing → persistence → matching → enquiry → usability → illustrative impact → public deployment.

## 12. Verification checklist

Use one short manual script and a production build. An elaborate test suite is outside this timebox.

**Status (2 November 2026):** all items below were verified in the browser and/or by `pnpm check:foundation`; see `docs/verification.md`.

### Core behavior

- [x] Initial dataset renders and filters by material/locality.
- [x] CedarWorks can add a valid sawdust listing.
- [x] Empty quantity, zero quantity, negative price and unsupported values are rejected.
- [x] Free material with price zero is accepted.
- [x] Refresh retains the new listing and selected profile.
- [x] PanelLoop only sees eligible sawdust matches.
- [x] 50 kg lot fails the 100 kg minimum.
- [x] Haversine returns zero for identical coordinates and sensible distances for locality pairs.
- [x] Scoring example with 10 km / 50 km returns 96.
- [x] Buyer sends one enquiry; repeating does not add another.
- [x] Supplier sees the enquiry after profile switching; unrelated profile does not see it in its panel. This is a UI filter, not secure authorization.
- [x] Enquiry does not decrease inventory or claim a completed transfer.
- [x] Potential 600 kg at ₹2/kg shows ₹1,200; illustrative 0.4 scenario shows 240 kgCO2e.
- [x] Enquiry leaves recorded CO₂e at zero; explicitly recorded 600 kg adds 240 illustrative kgCO₂e.
- [x] Duplicate, unrelated-business, over-enquiry, over-supply and over-demand reuse are rejected.
- [x] Dashboard scopes and ledger totals agree and survive refresh. What-if inputs do not alter them.
- [x] Phase 1 state loads with an empty reuse ledger.
- [x] Launchers handle spaces in paths, unavailable dependencies/ports, startup errors and an existing server. Browser opens only after readiness. *(macOS verified; Windows `start.bat` reviewed but not run natively.)*
- [x] Reset clears only Symbio data and restores fixtures.
- [x] Browser-storage failure shows a message instead of crashing.
- [x] Layout works at mobile width; forms have labels and visible keyboard focus.

### Build checks

```bash
pnpm exec eslint .
pnpm exec tsc --noEmit
pnpm build
```

Fix failures before adding features. Add small matching-function tests only if the project already has test tooling and time remains; do not spend the timebox setting up browser automation.

## 13. Deployment and two-minute demo

### Deployment

If Vercel is already available, import/push the repository, select Next.js defaults and deploy. This version requires **no environment variables**. Check the hosted app in a fresh browser: it should initialize fixtures locally. Never claim that an enquiry created on your laptop will appear on a judge’s separate device.

Otherwise run locally with `./start.sh` (macOS/Linux) or `start.bat` (Windows); both open the browser automatically. `pnpm dev` remains available without automatic opening. README includes prerequisites, install/start/build commands and the browser-local limitation. Public deployment is optional within the timebox, not a prerequisite for a basic working model.

### Demo sequence

1. **0:00–0:20:** Explain the problem and point out fictional demo data.
2. **0:20–0:45:** As CedarWorks, add a sawdust listing.
3. **0:45–1:15:** Switch to PanelLoop, choose its requirement, show matching reasons.
4. **1:15–1:35:** Send an enquiry; switch back to the supplier and display it.
5. **1:35–1:50:** Record fictional reuse and open Carbon impact. Show the 0.4 assumption and explain that this is a scenario estimate, not verified savings.
6. **1:50–2:00:** Refresh to demonstrate persistence; explain that shared accounts/database are the next step.

Keep a screenshot or short recording as backup. Do not show code or create service accounts during the demo.

## 14. After the working model: Supabase upgrade

Only start this after the three-hour definition of done passes. This is a separate iteration, not hidden scope inside the timebox.

1. Add Supabase Auth with the documented Next.js SSR browser/server clients and session-refresh Proxy.
2. Replace demo profiles with authenticated users and organization memberships.
3. Create `organizations`, `memberships`, `listings`, `requirements`, and `enquiries` tables via migrations.
4. Add ownership constraints and RLS: published listing reads; owner listing writes; enquiry reads only for buyer/supplier members; buyer may create only for its organization. Test with unrelated user JWTs.
5. Swap local persistence for user-scoped Supabase reads/writes. Use publishable key plus session; keep privileged keys outside the app.
6. Add multi-device synchronization and deployment environment variables.
7. Add transactional inventory reservations only when acceptance/fulfilment becomes part of the product. Sending an enquiry still must not reserve stock.
8. Replace the illustrative emissions scenario with reviewed material/pathway factors and a documented boundary; otherwise keep mass-only reporting.
9. Add maps, uploads and notifications one at a time based on demonstrated need.

Expected additional effort is separate from the three-hour target and depends on the authentication, policy and workflow requirements.

## 15. Reference documentation

These official references were checked while preparing the original plan on 2 November 2026; the basic version deliberately needs fewer services.

- [Next.js installation and runtime requirements](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js deployment on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Supabase Next.js setup — later database iteration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase SSR clients and session handling](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [EPA WARM — methodology reference for later validated estimates](https://www.epa.gov/waste-reduction-model)

**Definition of done:** The user can create a listing, find a compatible buyer fit, send and view an enquiry, and refresh without losing data. The continuation also requires working launchers and the Carbon Offset Calculator with explicit fictional reuse records and clearly labeled assumptions. Shared accounts and public deployment remain optional.
