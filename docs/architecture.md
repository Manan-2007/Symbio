# Symbio architecture (three-hour prototype)

Source of truth for scope: [`plan.md`](../plan.md). This file describes how the code is wired.

## Data flow

```text
UI (src/components/symbio-app.tsx)
  └─ useDemo() ──> DemoProvider (src/components/demo-provider.tsx)   React state, the only copy
                     ├─ pure transitions  src/lib/demo-actions.ts    addListing / sendEnquiry / selectBusiness
                     ├─ validators        src/lib/validation.ts      shape, bounds, references
                     └─ storage adapter   src/lib/storage.ts         load / save / clear one key
                                            └─ window.localStorage["symbio-demo-v1"]  { schemaVersion: 1, ... }
```

- **One source of truth.** `DemoState` (`selectedBusinessId`, `listings`, `enquiries`, `diversions`) lives in a single `useState` in `DemoProvider`. Components read it through `useDemo()` and never keep their own copies. Display names are derived from business IDs.
- **Static fixtures.** Businesses, buyer requirements, material labels and the four synthetic locality coordinates are constants in `src/lib/seed.ts`. They are not stored; stored records are validated against them.
- **Actions.** Each provider action validates against the latest state (a ref), then commits through a functional `setState` that re-applies the same pure transition to `prev`. Rapid repeated calls therefore cannot create duplicates. New IDs come from `crypto.randomUUID()`.

## Client/server boundary

- `src/app/page.tsx` and `layout.tsx` are Server Components. They render the `DemoProvider` client boundary and nothing that touches browser APIs.
- `DemoProvider` starts in `loading`; the server render and the first client render both show the loading message, so hydration matches. `localStorage` is read only inside a mount effect.
- Saving happens in an effect that runs **only** when status is `saved`, i.e. after a successful load (or an empty store). Seed data never overwrites saved data.

## Storage states

| Status | Cause | Behaviour |
|---|---|---|
| `loading` | before mount effect | loading message, actions refused |
| `saved` | storage readable | every change written to `symbio-demo-v1` |
| `unavailable` | access/read/write throws (blocked, private mode, quota) | in-memory state, warning shown |
| `corrupt` | bad JSON or any invalid record | seed shown in memory, saving paused, saved data untouched, reset offered |
| `unsupported` | `schemaVersion` ≠ 1 | same as corrupt |

Reset removes only `symbio-demo-v1` (never `localStorage.clear()`) and restores fixtures.

## Matching and carbon modules

- `src/lib/matching.ts`: eligibility gates, Haversine distance, deterministic ranking and match explanations. `applySendEnquiry` rechecks eligibility against current state.
- `src/lib/impact.ts`: invented 0.4 scenario factor, arithmetic and deduplicated recorded-demo totals. Match potentials and enquiries are never summed into recorded impact.
- `applyRecordDiversion`: separate one-time fictional reuse records against enquiries, restricted to an involved demo business. Whole-state validation enforces quantity bounds and cumulative supply/buyer demand limits in integer grams.
- Additive v1 compatibility: missing `diversions` loads as `[]`; malformed present records reject the whole saved state without overwriting it.
- UI modules: `marketplace.tsx`, `listing-form.tsx`, `matches.tsx`, `enquiries.tsx`, `carbon-dashboard.tsx`. `symbio-app.tsx` retains the shell, profile controls, storage warnings and four keyboard-accessible tabs.
- Inventory remains the original listed lot; enquiry and reuse records are separate. This is a demo ledger, not fulfilment or inventory reservation.

## Local launchers

`start.sh` and `start.bat` resolve the project directory and invoke `scripts/start.mjs`. The shared Node launcher checks the Node version, installs missing dependencies through pnpm, reuses this project's live Next dev lock/URL when available, otherwise checks the requested port and starts Next bound to loopback. An HTTP readiness check precedes browser opening. Startup errors and timeout are reported; Ctrl+C cleans up the owned process tree. The launcher never stops a server it reused. `--no-open` supports terminal-only use; `--port` controls a new server.

## Deferred integrations

Supabase and Google Maps are **not** initialised or called. A shared database needs authentication, ownership rules and RLS testing (plan §14), which does not fit the timebox; putting privileged keys in the client to fake it is not acceptable. Later, `storage.ts` (load/save) and `demo-actions.ts` (writes) are the seams to replace with user-scoped Supabase reads/writes, and `CITY_COORDINATES` is the seam for geocoding.

## File layout

```text
src/app/{layout,page}.tsx, globals.css   shell, theme tokens
src/components/demo-provider.tsx         state, hydration, persistence, actions
src/components/symbio-app.tsx            header, notice, profile selector, tabs, panels
src/lib/types.ts                         data model (plan §5.1)
src/lib/seed.ts                          fixtures and lookups
src/lib/validation.ts                    shared validators and bounds
src/lib/demo-actions.ts                  pure state transitions
src/lib/storage.ts                       safe localStorage adapter
scripts/check-foundation.mjs             lightweight data-layer checks
```

## Limitations

Data is per browser: each visitor of a deployed URL gets their own seed copy, and nothing syncs across devices or tabs. Profile switching is a demo story, not authentication or authorisation; anyone can act as any fictional business.
