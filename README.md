# Symbio

A B2B matchmaker for industrial by-products (sawdust, cotton offcuts, cardboard). This is a **three-hour working prototype** using fictional businesses and browser-local data. See [`plan.md`](plan.md) for scope, [`docs/architecture.md`](docs/architecture.md) and [`docs/requirements.md`](docs/requirements.md) for design and progress.

**Status:** Phases 1–4 of the local prototype are implemented: listing creation and filters, ranked matches, enquiries, and the Carbon Offset Calculator with an explicit demo reuse ledger. Public deployment and shared accounts remain future work.

## Run locally

Prerequisites: Node 20.9+ (an LTS release) and pnpm.

```bash
pnpm install
./start.sh        # macOS/Linux: starts the app and opens your browser
# Windows: double-click start.bat
# Alternative without automatic browser opening:
pnpm dev          # http://localhost:3000
```

The launchers work from paths containing spaces, install dependencies with the existing pnpm lockfile if missing, and open the default browser only after the app responds. If this project's dev server is already running, they reopen its existing URL. Keep the server's terminal open; Ctrl+C stops a server started by the launcher. A reused server stays managed by its original terminal.

Optional: `./start.sh --port 3100` (Windows: `start.bat --port 3100`) or `--no-open`. A port override applies when starting a new server. Use the same hostname and port to see existing browser-local data. A different origin has its own storage. If another application occupies the requested port, stop it or choose a different port.

Checks:

```bash
pnpm exec eslint .
pnpm typecheck         # next typegen && tsc --noEmit
pnpm build
pnpm check:foundation  # validation, storage, matching, carbon ledger and migration checks
```

No environment variables are needed. `.env.example` lists names reserved for later Supabase/Maps work; they are not read yet.

## Demo walkthrough

1. As CedarWorks, add a clean sawdust listing; zero price is accepted as free.
2. Use material/locality filters, or **Find buyer fit** on a listing.
3. Switch to PanelLoop, view match reasons and send an enquiry.
4. Switch back to CedarWorks and open Enquiries.
5. Open **Record demo reuse**, enter the fictional reused kg, acknowledge the demo, and save.
6. Open **Carbon impact**. A recorded 600 kg gives 240 **illustrative** kgCO₂e under the invented 0.4 factor. Sending an enquiry alone contributes zero.
7. Refresh: listings, selected profile, enquiries and reuse records persist.

The dashboard includes all-business/profile scopes, a dated ledger and an independent what-if calculator. Records cannot exceed the enquiry, original listing or total buyer requirement, and each enquiry can be recorded only once. The marketplace displays original listed lots; the demo does not implement live inventory or fulfilment.

## Demo and deployment

- Two-minute script with backup screenshots: [`docs/demo-script.md`](docs/demo-script.md).
- Vercel deployment steps: [`docs/deployment.md`](docs/deployment.md). No environment variables are required.

## Limitations

- **Demo only.** All businesses and figures are fictional.
- **Illustrative carbon estimate.** The default 0.4 kgCO₂e/kg is invented, not a reviewed material-specific factor. No real-world savings, verified offsets or carbon credits are claimed.
- **Windows verification:** `start.bat` delegates to the same Node launcher; a native Windows run is still needed.
- **Browser-local data.** Everything is stored under the `localStorage` key `symbio-demo-v1` in your browser. Each visitor to a deployed URL gets their own copy; nothing is shared across devices.
- **Profile switching is not a login.** Anyone can act as any demo business; it is not access control.
- If storage is blocked, the app keeps working in memory and shows a warning. If saved data is unreadable, it is left untouched until you choose **Reset demo**, which removes only Symbio's key.

## Keys and secrets (for later)

`NEXT_PUBLIC_*` variables are bundled into public browser code. A Supabase publishable key is only safe with correct RLS policies; the Supabase secret key bypasses RLS and must never reach the browser. Keep Google Maps browser and server keys separate.
