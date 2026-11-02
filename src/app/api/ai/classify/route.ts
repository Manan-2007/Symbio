import { chatCompletion, isAzureConfigured } from "@/server/azure-openai";
import { MATERIALS, findMaterial } from "@/services/catalog";

const MAX_IMAGE_CHARS = 1_600_000;
const IDS = MATERIALS.map((m) => `${m.id} = ${m.name}`).join("; ");

const PROMPT = `Identify the industrial by-product in this photo for a waste marketplace.
Choose exactly one materialId from: ${IDS}; or "unknown" if none fits or the image is not an industrial material.
Return JSON only: {"materialId": string, "confidence": number 0-1, "notes": [up to 4 short strings about visible quality, contamination, moisture or sorting]}.
Be conservative: lower confidence when the photo is ambiguous.`;

export async function POST(request: Request) {
  if (!isAzureConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  let body: { image?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const image = body.image;
  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "Send a JPEG, PNG or WebP image under about 1 MB." }, { status: 400 });
  }

  try {
    const text = await chatCompletion([
      { role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: image, detail: "low" } }] },
    ], { maxTokens: 250, json: true, temperature: 0 });
    const parsed = JSON.parse(text) as { materialId?: unknown; confidence?: unknown; notes?: unknown };
    const notes = Array.isArray(parsed.notes) ? parsed.notes.filter((n): n is string => typeof n === "string").map((n) => n.slice(0, 160)).slice(0, 4) : [];
    if (typeof parsed.materialId !== "string" || !findMaterial(parsed.materialId)) {
      return Response.json({ materialId: null, confidence: 0, notes: notes.length ? notes : ["The model could not match this photo to a catalogue material."] });
    }
    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
    return Response.json({ materialId: parsed.materialId, confidence, notes });
  } catch {
    return Response.json({ error: "classifier_unavailable" }, { status: 502 });
  }
}
