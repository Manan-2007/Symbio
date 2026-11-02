// Upcycling Yield & Barter (MVE) estimate: shared shape between the API route and the UI.
// Pure TS so the server can validate model output and the client can render and scale it.

export type BarterInput = {
  industryA: string;
  byproduct: string;
  industryB: string;
  finalProduct: string;
  quantityKg: number;
};

export type BarterVariable = { symbol: string; meaning: string; value: string };
export type BarterExchangeItem = { item: string; quantity: string; valueVu: number };
export type BarterRisk = { title: string; detail: string; mitigation: string };

export type BarterEstimate = {
  process: { type: "subtractive" | "additive" | "hybrid"; summary: string; mechanics: string[] };
  yield: {
    formula: string;
    variables: BarterVariable[];
    baselineInputKg: number;
    baselineOutputKg: number;
    explanation: string;
  };
  mve: {
    unit: string; // e.g. "VU (1 VU = value of 1 kg virgin material)"
    disposalOffset: number; // Do, per baseline input
    disposalOffsetNote: string;
    virginOffset: number; // Vo
    virginOffsetNote: string;
    processingCost: number; // Pc
    processingCostNote: string;
    formula: string;
    exchange: BarterExchangeItem[];
    ratio: string;
  };
  risks: BarterRisk[];
};

export const BARTER_LIMITS = { text: 120, minKg: 1, maxKg: 10_000_000 } as const;

export function validateBarterInput(raw: unknown): BarterInput | string {
  if (typeof raw !== "object" || raw === null) return "Invalid request.";
  const v = raw as Record<string, unknown>;
  const text = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  const input = { industryA: text(v.industryA), byproduct: text(v.byproduct), industryB: text(v.industryB), finalProduct: text(v.finalProduct), quantityKg: v.quantityKg };
  for (const [label, value] of [["Industry A", input.industryA], ["Byproduct", input.byproduct], ["Industry B", input.industryB], ["Final product", input.finalProduct]] as const) {
    if (value.length < 2 || value.length > BARTER_LIMITS.text) return `${label} must be 2–${BARTER_LIMITS.text} characters.`;
  }
  const kg = input.quantityKg;
  if (typeof kg !== "number" || !Number.isFinite(kg) || kg < BARTER_LIMITS.minKg || kg > BARTER_LIMITS.maxKg) return "Quantity must be between 1 kg and 10,000 t.";
  return { ...input, quantityKg: kg };
}

const str = (x: unknown, max = 600) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : typeof x === "string" && Number.isFinite(Number(x)) ? Number(x) : NaN);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** Coerces untrusted model JSON into a safe BarterEstimate, or null if essentials are missing. */
export function parseBarterEstimate(raw: unknown): BarterEstimate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, Record<string, unknown>>;
  const p = r.process ?? {};
  const y = r.yield ?? {};
  const m = r.mve ?? {};
  const type = p.type === "additive" || p.type === "subtractive" || p.type === "hybrid" ? p.type : null;
  const baselineInputKg = num(y.baselineInputKg);
  const baselineOutputKg = num(y.baselineOutputKg);
  const Do = num(m.disposalOffset);
  const Vo = num(m.virginOffset);
  const Pc = num(m.processingCost);
  if (!type || !str(y.formula) || !(baselineInputKg > 0) || !(baselineOutputKg >= 0) || ![Do, Vo, Pc].every(Number.isFinite)) return null;

  return {
    process: { type, summary: str(p.summary), mechanics: arr(p.mechanics).map((x) => str(x, 300)).filter(Boolean).slice(0, 5) },
    yield: {
      formula: str(y.formula, 200),
      variables: arr(y.variables).flatMap((x) => {
        const o = x as Record<string, unknown>;
        return str(o?.symbol, 20) ? [{ symbol: str(o.symbol, 20), meaning: str(o.meaning, 200), value: str(o.value, 80) }] : [];
      }).slice(0, 10),
      baselineInputKg,
      baselineOutputKg,
      explanation: str(y.explanation),
    },
    mve: {
      unit: str(m.unit, 120) || "VU",
      disposalOffset: Do, disposalOffsetNote: str(m.disposalOffsetNote, 300),
      virginOffset: Vo, virginOffsetNote: str(m.virginOffsetNote, 300),
      processingCost: Pc, processingCostNote: str(m.processingCostNote, 300),
      formula: str(m.formula, 200),
      exchange: arr(m.exchange).flatMap((x) => {
        const o = x as Record<string, unknown>;
        const valueVu = num(o?.valueVu);
        return str(o?.item, 120) ? [{ item: str(o.item, 120), quantity: str(o.quantity, 80), valueVu: Number.isFinite(valueVu) ? valueVu : 0 }] : [];
      }).slice(0, 6),
      ratio: str(m.ratio, 200),
    },
    risks: arr(r.risks).flatMap((x) => {
      const o = x as Record<string, unknown>;
      return str(o?.title, 120) ? [{ title: str(o.title, 120), detail: str(o.detail, 400), mitigation: str(o.mitigation, 400) }] : [];
    }).slice(0, 3),
  };
}

/** Yield ratio from the baseline, used to scale estimates to the user's quantity. */
export function yieldRatio(e: BarterEstimate): number {
  return e.yield.baselineInputKg > 0 ? e.yield.baselineOutputKg / e.yield.baselineInputKg : 0;
}

/** Net value created for Industry B per baseline input (Vo − Pc) and the share owed back to A. */
export function mveBalance(e: BarterEstimate) {
  const netToB = e.mve.virginOffset - e.mve.processingCost;
  const returnTotal = e.mve.exchange.reduce((s, x) => s + x.valueVu, 0);
  return { netToB, disposalOffset: e.mve.disposalOffset, returnTotal, surplus: netToB - returnTotal };
}
