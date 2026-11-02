# SYMBIO

**One Industry's Waste. Another Industry's Wealth.**

A B2B industrial by-product matchmaking platform: waste generators list surplus materials, waste consumers publish requirements, and a transparent matching engine connects them. It is a polished, fully working demo on local data, with all data and demo accounts stored in the browser (localStorage) and live Azure OpenAI and Geoapify integrations.

> All companies, listings, reviews, testimonials and impact figures are **fictional demo data**. Accounts are simulated and data lives in your browser.

## Run locally

Prerequisites: Node 20.9+ (LTS) and pnpm.

```bash
pnpm install
./start.sh        # macOS/Linux: starts the app and opens your browser (Windows: start.bat)
pnpm dev          # alternative, http://localhost:3000
```

The launchers work from paths with spaces, install dependencies from the lockfile if missing, open the browser once the app responds, and reuse this project's running dev server. Options: `--port 3100`, `--no-open`.

Checks:

```bash
pnpm exec eslint .
pnpm typecheck          # next typegen && tsc --noEmit
pnpm build
pnpm check:platform     # matching engine, carbon, deal workflow, validation, AI fallbacks
pnpm check:foundation   # original 3-hour prototype (/prototype)
```

**Fastest demo:** home page → **Watch Demo** → *Try it live as FreshGrow*. Or pick any demo company on `/login` (no password needed).

## Features

| Area | What works |
|---|---|
| Landing | Editorial hero with an SVG render-style globe, animated stats, how it works, generator/consumer sections, categories, a live 97.5% matching showcase, featured listings, impact, demo testimonials, CTA |
| Auth | Login, registration (company, email, password, industry, location, contact, role: Generator / Consumer / Both), forgot password, company profile setup |
| Dashboard | Greeting, waste listed, active matches, completed exchanges, estimated CO₂e, monthly chart, category donut, recommended matches, recent activity, quick actions |
| Marketplace | Search, 7 categories, location, minimum quantity, maximum price, saved listings, sorting; listing details with quality data, reuse routes, supplier, contact seller, save |
| Listings | Material, category, description, quantity + unit (kg/tonne), price, location, quality grade, moisture, contamination, availability, photo upload (resized in-browser) |
| Requirements | Material, quantity, budget, location + radius, minimum quality, contamination and moisture limits, delivery preference, notes |
| Smart matching | `Score = M×0.40 + Q×0.25 + D×0.25 + P×0.10`; hard rejection of incompatible material, low quality, excess contamination/moisture, out-of-radius and self-matches; explanations; "filtered out" reasons; both directions |
| Negotiation | Purchase requests, counter-offers on quantity and price, accept/decline/withdraw, seller dispatch, buyer receipt, messaging, status tracker |
| Barter estimator | Upcycling Yield & MVE barter analysis (gpt-4o): subtractive/additive classification, yield formula with variables and scalable baseline, Do / Vo / Pc valuation with a computed balance check, what Industry B returns, 2–3 risks with mitigations; pre-filled from any match |
| Map | Geoapify map tiles, place search, nearby companies by radius and role, driving route with road distance and time |
| Impact | Reused kg, CO₂e from material-specific illustrative factors, landfill diverted, exchanges, monthly charts, category share, company table, methodology |
| Profiles & history | Company profile with verification, listings, reviews and trust score; transaction table with filters and CSV export |
| AI | Waste classifier (gpt-4o vision suggests the material, user confirms) and a floating Symbio Assistant (gpt-4o, grounded in the catalogue and current listings) |

## Integrations

| Service | Used for | Status | Where |
|---|---|---|---|
| Azure OpenAI (gpt-4o) | Symbio Assistant answers; photo classification; Upcycling & Barter estimator | Live | `src/server/azure-openai.ts`, `src/app/api/ai/*` |
| Geoapify | Map tiles, driving routes and road distance, place search on the Map page | Live | `src/server/geoapify.ts`, `src/app/api/geo/*` |

All secret keys stay server-side in route handlers. **Integrations** in the app sidebar shows live status (`GET /api/status`, which never reveals key values).

## Prototype vs real

| Real | Prototype (hardcoded, clearly labelled) |
|---|---|
| Matching engine, validation, negotiation workflow, carbon arithmetic, charts, filters, CSV export, photo resize, AI assistant and classifier, maps, routes, geocoding | **Payments:** escrow checkout (UPI / net banking / card / NEFT), held on payment, released on receipt, refunded on cancel; no money moves, no payment details collected. **Notifications:** in-app bell derived from activity. **Verification:** GSTIN format check plus document name, then "Simulate approval". **Accounts and marketplace data:** stored only in this browser's localStorage; passwords are kept as salted PBKDF2 hashes. Demo companies use password `demo1234` |

## Setup checklist (what's still missing and how to fix it)

1. **Rotate the shared keys.** The Azure OpenAI and Geoapify keys were shared in chat; regenerate them in the Azure portal / Geoapify dashboard and update `.env.local`.
2. **Restrict keys.** The Geoapify key is used only by SYMBIO's server, so do **not** add an HTTP-referrer (origin) restriction: server requests send no referrer and would be blocked. Once deployed, add your server's outbound IP in Geoapify → API key settings, and set a daily request quota. For Azure OpenAI, use the resource's networking rules to allow only your server once deployed.
3. **Deploying (e.g. Vercel):** add every variable from `.env.local` in the project settings. The app needs a Node server (API routes), not a static export.
4. **Shared accounts and data (if ever needed).** Everything is per-browser by design. Multi-device use would need a server database and real authentication replacing `src/services/storageService.ts`.
5. **Real payments.** Use a payment gateway with escrow support from server routes; never collect card details in the browser.
6. **Real verification.** Review GST documents server-side in an admin tool.
7. **Email/SMS notifications.** Send via a provider from a server route.
8. **Rate limiting.** Add per-IP limits to `/api/ai/*` before public launch to control Azure costs.

## Limitations

- Data is per browser (`localStorage` key `symbio-app-v2`); nothing syncs across devices. **Reset demo data** in the sidebar clears only that key.
- Matching distance uses straight-line estimates between approximate city centres; road distance is shown on maps via Geoapify.
- Carbon numbers are illustrative estimates, not certified offsets or credits.
- `start.bat` has not been run on native Windows.
- The original three-hour prototype remains at `/prototype` (key `symbio-demo-v1`), with its [demo script](docs/demo-script.md).

Docs: [architecture](docs/architecture.md) · [requirements](docs/requirements.md) · [deployment](docs/deployment.md) · [plan](plan.md).
