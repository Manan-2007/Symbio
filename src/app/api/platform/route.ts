import { NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { loadPlatform } from "@/server/platform";
import * as A from "@/services/actions";
import type { Result } from "@/services/types";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return reply({ authenticated: false, configured: false });
  try {
    const client = await serverSupabase();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return reply({ authenticated: false, configured: true });
    return reply({ authenticated: true, state: await loadPlatform(client, user) });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : "Unable to load shared data." }, 503); }
}

export async function POST(request: NextRequest) {
  if (!request.headers.get("origin") || new URL(request.headers.get("origin")!).host !== request.headers.get("host")) return reply({ error: "Invalid request origin." }, 403);
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 1_600_000) return reply({ error: "Request too large." }, 413);
    const raw = await request.text();
    if (raw.length > 1_600_000) return reply({ error: "Request too large." }, 413);
    const { action, input = {}, id } = JSON.parse(raw);
    if (typeof action !== "string" || !input || typeof input !== "object" || Array.isArray(input)) return reply({ error: "Invalid action." }, 400);
    const client = await serverSupabase();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return reply({ error: "Your session expired. Sign in again." }, 401);
    const state = await loadPlatform(client, user);
    const ctx = { newId: () => crypto.randomUUID(), now: new Date().toISOString() };
    let validation: Result<unknown>;
    switch (action) {
      case "addListing": validation = A.addListing(state, input, ctx); break;
      case "addRequirement": validation = A.addRequirement(state, input, ctx); break;
      case "updateProfile": validation = A.updateProfile(state, input); break;
      case "requestDeal": validation = A.requestDeal(state, input, ctx); break;
      case "counterOffer": validation = A.counterOffer(state, id, input, ctx); break;
      case "sendMessage": validation = A.sendMessage(state, id, input.text, ctx); break;
      case "setListingStatus": validation = A.setListingStatus(state, id, input.status); break;
      case "setRequirementStatus": validation = A.setRequirementStatus(state, id, input.status); break;
      case "toggleSaved": validation = A.toggleSaved(state, id); break;
      case "submitVerification": validation = A.submitVerification(state, input, ctx); break;
      case "acceptDeal": validation = A.acceptDeal(state, id, ctx); break;
      case "rejectDeal": validation = A.rejectDeal(state, id, ctx); break;
      case "cancelDeal": validation = A.cancelDeal(state, id, ctx); break;
      // Shared exchanges are settled outside Symbio; no simulated escrow is required.
      case "markDispatched": case "markReceived": case "markNotificationsSeen": validation = { ok: true, value: null }; break;
      default: return reply({ error: "This action is only available in the local demo." }, 400);
    }
    if (!validation.ok) return reply({ error: validation.error }, 400);
    let imagePath: string | null = null;
    if (action === "addListing" && input.imageDataUrl) {
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(input.imageDataUrl);
      if (!match) return reply({ error: "Use a JPEG, PNG or WebP image." }, 400);
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > 1_125_000) return reply({ error: "Image is too large." }, 400);
      imagePath = `${state.session!.companyId}/${crypto.randomUUID()}.${match[1]}`;
      const upload = await client.storage.from("listing-images").upload(imagePath, bytes, { contentType: `image/${match[1]}`, upsert: false });
      if (upload.error) return reply({ error: "Image upload failed. Check the listing-images bucket and policies." }, 400);
    }
    const { imageDataUrl: ignoredImage, ...fields } = input;
    void ignoredImage;
    const result = await client.rpc("app_mutate", { action, p: { ...fields, ...(id ? { id } : {}), ...(action === "addListing" ? { imagePath } : {}) } });
    if (result.error) {
      if (imagePath) await client.storage.from("listing-images").remove([imagePath]);
      return reply({ error: result.error.code === "23505" ? "An open request already exists for this listing." : result.error.message }, 400);
    }
    return reply({ state: await loadPlatform(client, user), id: result.data?.id });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : "Unable to save changes." }, 400); }
}
