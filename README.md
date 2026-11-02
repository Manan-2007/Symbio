# SYMBIO

**One Industry's Waste. Another Industry's Wealth.**

A B2B industrial by-product matchmaking platform: waste generators list surplus materials, waste consumers publish requirements, and a transparent matching engine connects them. It is a polished, fully working demo on local data, with clear seams for Supabase, Google Maps and AI services.

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
| Map | Nearby companies by radius and role, straight-line distances, route line; schematic map by default, Google Maps when configured |
| Impact | Reused kg, CO₂e from material-specific illustrative factors, landfill diverted, exchanges, monthly charts, category share, company table, methodology |
| Profiles & history | Company profile with verification, listings, reviews and trust score; transaction table with filters and CSV export |
| AI-ready | Waste classifier (photo + catalogue guidance; calls an endpoint only when configured) and a floating Symbio Assistant (offline catalogue answers, or an endpoint) |

## Demo-only vs integrated

| Genuinely working | Demo / simulated | Integration-ready, not connected |
|---|---|---|
| Matching engine, validation, negotiation workflow, carbon arithmetic, charts, filters, CSV export, photo resize, persistence across refresh | Authentication (passwords length-checked, never stored; switching companies is not access control), verification badges, reviews, trust score, testimonials, carbon factors | Supabase auth/DB/storage (config detected in `src/services/integrations.ts`; local adapter active). Google Maps (loads with `NEXT_PUBLIC_ENABLE_MAPS=true` + key; untested without a key). AI classifier/assistant endpoints |

## Environment variables

None are required. [`.env.example`](.env.example) lists the reserved names: Supabase URL and publishable key (plus the server-only secret key), the Maps flag and keys, and two AI endpoints. `NEXT_PUBLIC_*` values are visible in browser code, so never put secret or AI-provider keys in them.

## Limitations

- Data is per browser (`localStorage` key `symbio-app-v2`); nothing syncs across devices. **Reset demo data** in the sidebar clears only that key.
- Distances are straight-line estimates between approximate city centres, not routes.
- Carbon numbers are illustrative estimates, not certified offsets or credits.
- `start.bat` has not been run on native Windows.
- The original three-hour prototype remains at `/prototype` (key `symbio-demo-v1`), with its [demo script](docs/demo-script.md).

Docs: [architecture](docs/architecture.md) · [requirements](docs/requirements.md) · [deployment](docs/deployment.md) · [plan](plan.md).
