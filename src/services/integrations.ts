// Browser-visible integration settings. Server-only keys (Azure OpenAI, Geoapify) live in route
// handlers under src/app/api and src/server; their status is reported by GET /api/status.

export const integrations = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  },
} as const;

export const isSupabaseConfigured = () => Boolean(integrations.supabase.url && integrations.supabase.publishableKey);
