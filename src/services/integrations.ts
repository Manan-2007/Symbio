// Configuration seams for external services. Nothing here calls a network API unless the
// matching public variable is set. Secret keys never belong in this file or any client code.

export const integrations = {
  /** Supabase (auth, Postgres, storage). Not wired yet: local storage is the active adapter. */
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  },
  maps: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_MAPS === "true",
    browserKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "",
  },
  /** Optional HTTPS endpoints for AI features. Unset = honest "not connected" states. */
  ai: {
    classifierEndpoint: process.env.NEXT_PUBLIC_AI_CLASSIFIER_ENDPOINT ?? "",
    assistantEndpoint: process.env.NEXT_PUBLIC_AI_ASSISTANT_ENDPOINT ?? "",
  },
} as const;

export const isSupabaseConfigured = () => Boolean(integrations.supabase.url && integrations.supabase.publishableKey);
export const isMapsConfigured = () => integrations.maps.enabled && Boolean(integrations.maps.browserKey);
