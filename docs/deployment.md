# Deploying SYMBIO

The current platform is a Next.js application with browser-local demo data and optional server-side Azure OpenAI and Geoapify integrations. The core demo works without credentials; external features require the environment variables below.

## Vercel

1. Import [Manan-2007/Symbio](https://github.com/Manan-2007/Symbio) as a new Vercel project.
2. Select the **Next.js** framework preset. Use the committed pnpm lockfile and a Node runtime compatible with Next.js and the declared pnpm version.
3. Add the required variables from [`.env.example`](../.env.example) to the relevant Preview and/or Production environment.
4. Deploy. Redeploy after changing environment variables so the deployment receives the new configuration.
5. Check `/integrations`, then test each configured feature with fictional sample data.

The public demo is [symbio-eight.vercel.app](https://symbio-eight.vercel.app/). Azure OpenAI and Geoapify variables are set in its Production and Preview environments. `/api/status` confirms variable presence; exercise the individual features to check provider responses.

## Environment variables

| Variable | Use |
| --- | --- |
| `AZURE_OPENAI_API_KEY` | Server-only Azure OpenAI key |
| `AZURE_OPENAI_ENDPOINT` | Resource URL or full chat-completions URL |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name; default `gpt-4o` |
| `AZURE_OPENAI_API_VERSION` | Version used when constructing the URL; default `2025-01-01-preview` |
| `GEOAPIFY_API_KEY` | Server-only maps, routing and geocoding key |
| `NEXT_PUBLIC_APP_URL` | App URL placeholder included in the example environment file |

Never prefix a secret key with `NEXT_PUBLIC_`. Local credentials belong in the ignored `.env.local`; hosting credentials belong in the host’s environment settings.

`GET /api/status` returns configuration flags without secret values. It checks variable presence, not provider connectivity, account quota or key validity. A configured status alone does not prove that AI or maps work.

## Runtime boundary

Keep the Next.js server runtime. `/api/ai/*` and `/api/geo/*` require server route handlers; a static export cannot provide the current application’s integrations. The original `/prototype` route still runs without these services, but its earlier deployment assumptions do not describe the whole platform.

Azure OpenAI requests have a 25-second upstream timeout. Geocoding, routing and map requests use bounded timeouts, and geospatial responses are cached. Configure hosting limits appropriately for these server calls.

## Verification checklist

- [ ] The landing page, marketplace and demo-company login load.
- [ ] FreshGrow’s sawdust match shows 97.5% with explanations.
- [ ] Listings and the selected company survive a refresh in the same browser.
- [ ] `/integrations` shows the intended configuration.
- [ ] The assistant responds, or clearly falls back to catalogue guidance.
- [ ] A sample classifier request returns a suggestion or explicit no-match result when AI is enabled.
- [ ] A built-in barter example returns an estimate when AI is enabled.
- [ ] Place search and a driving route work when Geoapify is enabled.
- [ ] Unconfigured integrations show unavailable/fallback states.

## Data and production scope

Each browser gets its own fictional seed data and stores changes under `symbio-app-v2`. Deploying to Vercel does not introduce shared accounts, cross-device exchanges or a database. The original prototype uses `symbio-demo-v1`; contact submissions use `symbio-contact-v1` and are not delivered to a team inbox.

Payments, verification and password-reset delivery are simulations. A production service needs shared persistence, server-enforced authentication and permissions, inventory coordination, real payment and verification services, and API quotas/rate limits. Carbon reporting requires reviewed factors and confirmed transfer evidence. See the [README boundaries and roadmap](../README.md#what-is-implemented-simulated-and-next).
