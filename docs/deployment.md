# Deployment (optional)

The prototype needs **no environment variables** and no backend, so it deploys as a static Next.js app.

## Vercel (from GitHub)

1. Sign in at vercel.com and choose **Add New → Project**.
2. Import `Manan-2007/Symbio`. Framework preset: **Next.js**. Leave build/install commands at their defaults (Vercel detects pnpm from `pnpm-lock.yaml`).
3. Do not add environment variables. Deploy.
4. Open the URL in a fresh/private window: it should show the six seed listings and the amber demo notice.

## What to tell viewers

Each visitor's browser starts from the seed data and keeps its own copy. An enquiry made on one device never appears on another. Profile switching is not a login.

## Later (not in this prototype)

All data and demo accounts are stored per browser in localStorage. Add `GEOAPIFY_API_KEY` and the `AZURE_OPENAI_*` variables in the host's settings; never expose them as `NEXT_PUBLIC_`.
