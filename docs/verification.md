# Local verification — 2 November 2026

## Passed

- `pnpm lint`.
- `pnpm typecheck` (Next route types and strict TypeScript).
- `pnpm check:foundation`: fixtures, validation, action ownership/duplicates, storage failure/reset, exact-material matching, minimum/distance gates, deterministic ties, score arithmetic, legacy Phase 1 loading, reuse duplicates/bounds, overlapping demand, totals and profile scopes.
- Production build: `node node_modules/next/dist/bin/next build` completed and prerendered `/` and `/_not-found`.
- `bash -n start.sh` and `node --check scripts/start.mjs`.
- Launcher: fresh server startup, HTTP readiness, existing-server reuse, consistent localhost origin, macOS browser-open command, `--no-open`, and invalid port/unknown argument rejection.

The initial package-manager build attempt hit a sandbox worker-port restriction. Running the same installed Next CLI through Node with the required execution permissions passed. No framework or dependency downgrade was needed.

## Browser walkthrough

Verified against the local app:

1. Six seeded listings rendered.
2. CedarWorks published a 725 kg sawdust listing at ₹0/kg; the card showed Free.
3. After refresh, the added listing remained and appeared in PanelLoop matches.
4. PanelLoop's seed match showed 600 kg, ₹1,200, match reasons and 240 illustrative kgCO₂e.
5. Sending its enquiry left the recorded carbon dashboard at zero.
6. Switching to CedarWorks showed the incoming 600 kg enquiry.
7. Recording 600 kg of explicitly fictional reuse populated the dashboard with 600 kg, 240 illustrative kgCO₂e and one ledger record.
8. Refresh retained the ledger and selected business.
9. Changing the what-if factor to 0.8 produced 480 hypothetical kgCO₂e while recorded totals remained unchanged.
10. Selecting an unrelated business's dashboard scope showed zero records and an empty state.
11. Cardboard + Whitefield filters returned an empty marketplace; Clear filters restored the listings.
12. At a 360 px viewport the dashboard had no horizontal page overflow. Four tabs use two rows. Form controls render with borders and a minimum 44 px height. Restored the default viewport afterward.
13. Captured browser warning/error logs were empty.

The earlier running dev server retained an old stylesheet during hot reload. Restarting it through the launcher refreshed the CSS. The final screenshot is `screenshots/carbon-dashboard.jpg`.

The test browser retains one added fictional listing, one enquiry and one reuse record so the dashboard can be reviewed. This data is browser-local, not part of the seed fixtures.

## Follow-up review — Claude Code, 2 November 2026

- Re-ran `pnpm exec eslint .`, `pnpm typecheck`, `pnpm check:foundation` and `pnpm build`: all pass.
- Re-ran the full plan §12 journey in a clean browser profile (filters, form validation, matching gates, 600 kg / ₹1,200 / 240 kgCO₂e, duplicate enquiry, supplier visibility, unrelated profile, reuse bounds, dashboard scopes, what-if isolation, refresh persistence, 375 px layout).
- Fixed: double-clicking **Send enquiry** saved one enquiry (correct) but replaced the success notice with the duplicate error. The second click's duplicate error is now ignored.
- Rehearsed the two-minute demo from a reset; backup screenshots in `screenshots/demo/`, script in `demo-script.md`.
- Launcher on macOS: existing-server reuse with `--no-open` and invalid-port rejection re-checked. Windows path reviewed by reading `start.bat`/`scripts/start.mjs` (quoted `%~dp0`, `shell` only for pnpm on win32, `taskkill /T` on stop, `rundll32` browser open); not executed on Windows.

## Remaining checks / limits

- Native Windows `start.bat` execution and Linux desktop browser opening were not available on this Mac.
- First-run dependency installation and the 120-second startup timeout were not exercised against a clean machine.
- Storage errors/reset were verified at the adapter level; blocked-storage browser mode was not separately exercised.
- No public deployment or shared backend was attempted. The project folder currently has no Git repository.
- Carbon values remain illustrative: the 0.4 factor is invented and reuse records are fictional.
