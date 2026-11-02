import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { integrations, isSupabaseConfigured } from "./integrations";

// Browser client using the publishable key. Safe only because every table has RLS
// (see supabase/schema.sql). Never use the secret key here.

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= createBrowserClient(integrations.supabase.url, integrations.supabase.publishableKey);
  return client;
}

export type ContactInput = { name: string; email: string; company: string; topic: string; message: string };

/** Stores a contact message if Supabase and the contact_messages table exist. */
export async function submitContactMessage(input: ContactInput): Promise<"stored" | "not_configured" | "failed"> {
  const supabase = getSupabase();
  if (!supabase) return "not_configured";
  const { error } = await supabase.from("contact_messages").insert({
    name: input.name, email: input.email, company: input.company || null, topic: input.topic, message: input.message,
  });
  return error ? "failed" : "stored";
}
