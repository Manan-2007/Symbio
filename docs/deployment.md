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

Shared data, accounts and RLS-protected tables are the Supabase iteration in `plan.md` §14. When it starts, add the variables listed in `.env.example` in Vercel's project settings; never expose `SUPABASE_SECRET_KEY` or `GOOGLE_MAPS_SERVER_KEY` to browser code.
