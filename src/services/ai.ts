import type { Category, Material } from "./types";
import { CATEGORY_LABELS, MATERIALS, findMaterial } from "./catalog";
import { integrations } from "./integrations";

// AI integration layer. Without a configured endpoint, nothing pretends to be AI:
// the classifier reports "not connected" and the assistant answers from the material catalogue.

export type ClassifierResult =
  | { status: "unavailable"; message: string }
  | { status: "ok"; materialId: string; confidence: number; notes: string[] }
  | { status: "error"; message: string };

/** Sends the image to the configured classifier endpoint, if any. Expected JSON: { materialId, confidence, notes }. */
export async function classifyMaterialImage(imageDataUrl: string): Promise<ClassifierResult> {
  const endpoint = integrations.ai.classifierEndpoint;
  if (!endpoint) {
    return { status: "unavailable", message: "No AI classification service is connected. Choose the material yourself to see catalogue guidance." };
  }
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: imageDataUrl }) });
    if (!response.ok) return { status: "error", message: `Classifier responded with ${response.status}.` };
    const data: unknown = await response.json();
    const r = data as { materialId?: unknown; confidence?: unknown; notes?: unknown };
    if (typeof r.materialId !== "string" || !findMaterial(r.materialId) || typeof r.confidence !== "number") {
      return { status: "error", message: "Classifier returned an unrecognised result." };
    }
    const notes = Array.isArray(r.notes) ? r.notes.filter((n): n is string => typeof n === "string").slice(0, 5) : [];
    return { status: "ok", materialId: r.materialId, confidence: Math.max(0, Math.min(1, r.confidence)), notes };
  } catch {
    return { status: "error", message: "Could not reach the classifier service." };
  }
}

/** Catalogue guidance for a known material: reuse routes, buyer industries and checks. */
export function materialGuidance(material: Material) {
  const checks: Record<Category, string[]> = {
    wood: ["Confirm untreated wood (no paint, laminate or preservatives).", "Keep moisture below 20% for storage.", "Separate MDF and plywood dust."],
    textile: ["Sort by fibre (cotton vs synthetic).", "Remove buttons, zips and metal trims.", "Keep dry to avoid mildew."],
    plastic: ["Identify polymer type (PET, HDPE, LDPE).", "Wash off labels, adhesives and food residue.", "Avoid mixing colours for higher value."],
    metal: ["Drain cutting oils.", "Separate ferrous from non-ferrous.", "Check for coatings and plating."],
    organic: ["Collect frequently to prevent spoilage.", "Exclude plastics and cutlery.", "Record moisture for compost recipes."],
    paper: ["Keep dry and baled.", "Remove plastic tape and laminates.", "Separate printed from unprinted."],
    construction: ["Remove rebar, wood and plastics.", "Screen for asbestos-containing materials.", "Grade by particle size."],
  };
  return { reuses: material.reuses, industries: material.industries, checks: checks[material.category] };
}

export type AssistantReply = { text: string; materialIds: string[]; source: "catalogue" | "service" };

const SUGGESTIONS = [
  "What can I do with sawdust?",
  "Who purchases textile waste?",
  "Which industries use recycled plastic?",
  "How can I find nearby buyers?",
];
export const ASSISTANT_SUGGESTIONS = SUGGESTIONS;

const KEYWORDS: Record<string, string[]> = {
  sawdust: ["sawdust", "wood dust"],
  wood_chips: ["wood chip", "chips", "mulch"],
  pallet_wood: ["pallet"],
  cotton_scraps: ["cotton", "fabric", "textile", "cloth"],
  polyester_scraps: ["polyester", "synthetic fabric"],
  pet_flakes: ["pet", "bottle", "recycled plastic", "plastic"],
  hdpe_regrind: ["hdpe"],
  plastic_film: ["film", "ldpe", "polythene"],
  steel_turnings: ["steel", "iron", "turnings", "metal"],
  aluminium_scrap: ["aluminium", "aluminum"],
  coffee_grounds: ["coffee", "grounds"],
  food_waste: ["food", "organic", "compost"],
  cardboard: ["cardboard", "carton", "corrugated"],
  paper_offcuts: ["paper"],
  concrete_rubble: ["concrete", "rubble", "construction", "debris"],
};

/** Offline, rule-based answers from the catalogue. Not an AI model. */
export function answerFromCatalogue(question: string): AssistantReply {
  const q = question.toLowerCase();
  if (/(nearby|near me|close|local|distance|find buyers|find a buyer|map)/.test(q)) {
    return {
      text: "Publish a listing (or a requirement if you're buying), then open Smart Matches: SYMBIO ranks counterparties by material, quantity, distance and price. The Map view shows companies around you with straight-line distances and lets you filter by radius.",
      materialIds: [], source: "catalogue",
    };
  }
  const hits = Object.entries(KEYWORDS).filter(([, words]) => words.some((w) => new RegExp(`\\b${w}`).test(q))).map(([id]) => id);
  const unique = [...new Set(hits)].slice(0, 2);
  if (unique.length === 0) {
    const categories = Object.values(CATEGORY_LABELS).join(", ");
    return { text: `I can explain reuse routes and typical buyers for ${categories.toLowerCase()}. Try asking about a specific material, like sawdust, cotton scraps or PET flakes.`, materialIds: [], source: "catalogue" };
  }
  const parts = unique.map((id) => {
    const m = MATERIALS.find((x) => x.id === id)!;
    return `${m.name}: commonly reused for ${m.reuses.slice(0, 3).join(", ").toLowerCase()}. Typical buyers are in ${m.industries.join(", ").toLowerCase()}.`;
  });
  return { text: `${parts.join(" ")} Browse the marketplace or publish a requirement to get matched.`, materialIds: unique, source: "catalogue" };
}

/** Uses the assistant endpoint when configured (expects { answer }), otherwise the catalogue. */
export async function askAssistant(question: string): Promise<AssistantReply> {
  const endpoint = integrations.ai.assistantEndpoint;
  if (!endpoint) return answerFromCatalogue(question);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    const data = (await response.json()) as { answer?: unknown };
    if (response.ok && typeof data.answer === "string") return { text: data.answer, materialIds: [], source: "service" };
  } catch {
    /* fall back below */
  }
  return answerFromCatalogue(question);
}
