"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Copy, FlaskConical, GitMerge, Layers, Loader2, Scale, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, PageHeader, Skeleton } from "@/components/ui/primitives";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { answerFromCatalogue, estimateBarter } from "@/services/ai";
import { useApp } from "@/components/app-provider";
import { TrustBadge } from "@/components/trust-badge";
import { buildBarterMarket, describeOffer } from "@/services/stableMatching";
import type { BarterMarket } from "@/services/stableMatching";
import { materialName } from "@/services/catalog";
import type { AppState, Company, Listing } from "@/services/types";
import { BARTER_LIMITS, mveBalance, yieldRatio } from "@/services/barter";
import type { BarterEstimate, BarterInput } from "@/services/barter";
import { cx, fmtNumber } from "@/utils/format";

const EXAMPLES: (BarterInput & { label: string })[] = [
  { label: "Sawdust → mushroom substrate", industryA: "Furniture workshop", byproduct: "Untreated hardwood sawdust", industryB: "Mushroom farm", finalProduct: "Oyster mushroom substrate blocks", quantityKg: 800 },
  { label: "Cotton scraps → insulation", industryA: "Garment manufacturer", byproduct: "Pre-consumer cotton cutting scraps", industryB: "Insulation maker", finalProduct: "Thermal insulation batts", quantityKg: 450 },
  { label: "PET flakes → food trays", industryA: "Plastic recycler", byproduct: "Washed clear PET flakes", industryB: "Packaging manufacturer", finalProduct: "Thermoformed food trays", quantityKg: 650 },
  { label: "Steel turnings → castings", industryA: "CNC machining shop", byproduct: "Oily mild steel turnings", industryB: "Foundry", finalProduct: "Grey iron castings", quantityKg: 900 },
  { label: "Coffee grounds → compost", industryA: "Café chain", byproduct: "Spent coffee grounds", industryB: "Compost producer", finalProduct: "Organic compost", quantityKg: 1200 },
];

const OFFER_ID = "your-offer";

/**
 * Turns the form's free-text byproduct into a marketplace offer the stable matcher can rank.
 * Uses the catalogue keywords; returns null when the text doesn't map to a known material.
 */
function offerFromInput(input: BarterInput, me: Company | null, state: AppState): Listing | null {
  const materialId = answerFromCatalogue(input.byproduct).materialIds[0];
  if (!materialId) return null;
  const city = me?.cityId ?? state.companies[0]?.cityId ?? "ludhiana";
  return {
    id: OFFER_ID, companyId: me?.id ?? "guest-offer", materialId, title: `${input.byproduct} (your offer)`, description: "",
    quantity: input.quantityKg, unit: "kg", quantityKg: input.quantityKg, pricePerKg: 0, cityId: city, location: me?.location,
    quality: "B", moisturePct: 12, contamination: "low", availability: "immediate", imageDataUrl: null, status: "active", createdAt: new Date().toISOString(),
  };
}

function StableMatches({ market, offerMaterial }: { market: BarterMarket; offerMaterial: string | null }) {
  const yours = market.pairs.find((p) => p.proposer.id === OFFER_ID);
  const offeredButUnmatched = offerMaterial && !yours;
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} aria-labelledby="stable-heading">
      <Card className="p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-forest text-white"><GitMerge className="size-4" aria-hidden /></span>
            <div>
              <h2 id="stable-heading" className="font-display text-[26px] leading-tight text-forest-950">Stable barter matches</h2>
              <p className="text-[12.5px] text-muted">Gale-Shapley over {market.proposers.length} offers and {market.reviewers.length} counterparties · {market.proposals} proposals · {market.stable ? "no blocking pairs" : "unstable"}</p>
            </div>
          </div>
          <Badge tone="green">Computed instantly · no AI</Badge>
        </div>
        {!offerMaterial && <Notice className="mb-4">Your byproduct didn&apos;t map to a catalogue material, so the market below shows the demo marketplace only. Try words like sawdust, cotton, PET, steel or coffee.</Notice>}
        {offeredButUnmatched && <Notice className="mb-4">No compatible counterparty accepted your {materialName(offerMaterial)} offer this round (material, quality and distance gates apply). Pairs for other offers are shown.</Notice>}
        {market.pairs.length === 0 ? (
          <p className="text-[14px] text-muted">No compatible offer–requirement pairs in the market yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-muted">
                  <th className="pb-2 font-semibold">Offer (proposer)</th>
                  <th className="pb-2 font-semibold">Matched counterparty (reviewer)</th>
                  <th className="pb-2 text-right font-semibold">Usable</th>
                  <th className="pb-2 text-right font-semibold">Net yield</th>
                  <th className="pb-2 text-right font-semibold">Ratio</th>
                  <th className="pb-2 text-right font-semibold">Score</th>
                  <th className="pb-2 text-right font-semibold">Choice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {market.pairs.map((p) => (
                  <tr key={p.proposer.id} className={p.proposer.id === OFFER_ID ? "bg-sage-50" : undefined}>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold">{p.proposer.id === OFFER_ID ? <Badge tone="sage">Your offer</Badge> : p.proposer.ownerName}</p>
                      <p className="text-[12px] text-muted">{describeOffer(p.proposer)}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <p className="flex flex-wrap items-center gap-1.5 font-semibold">{p.reviewer.ownerName}<TrustBadge score={p.reviewer.trustScore} /></p>
                      <p className="text-[12px] text-muted">Needs {fmtNumber(p.reviewer.requiredQty)} kg {materialName(p.reviewer.requiredItem).toLowerCase()} · makes {p.reviewer.itemOffered.toLowerCase()}</p>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{fmtNumber(p.usableKg)} kg</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-forest">{fmtNumber(p.netYieldKg)} kg</td>
                    <td className="py-2.5 text-right font-mono text-[12.5px]">{p.exchangeRatio}</td>
                    <td className="py-2.5 text-right tabular-nums">{p.match.score}%</td>
                    <td className="py-2.5 text-right text-[12px] text-muted" title="Rank each side gave the other (1 = first choice)">#{p.proposerChoice} / #{p.reviewerChoice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {market.unmatched.length > 0 && (
          <p className="mt-4 text-[12.5px] text-muted">Unmatched this round: {market.unmatched.map((u) => `${u.ownerName} (${materialName(u.itemType).toLowerCase()})`).join(", ")}.</p>
        )}
        <p className="mt-3 text-[12px] text-muted">Offers rank counterparties by match score, then usable yield, then trust; counterparties rank offers by match score, then supplier trust, then yield. Net yield uses illustrative recovery rates by category, reduced for contamination and excess moisture. Ratio = kg supplied : kg usable output.</p>
      </Card>
    </motion.section>
  );
}

const PROCESS_META = {
  subtractive: { label: "Subtractive", icon: Scissors, blurb: "Purification, separation or machining removes what isn't wanted." },
  additive: { label: "Additive", icon: Layers, blurb: "Binding, compounding or layering builds a new product around the byproduct." },
  hybrid: { label: "Hybrid", icon: FlaskConical, blurb: "Cleans the byproduct first, then compounds it into the product." },
} as const;

function Section({ n, title, children, delay = 0 }: { n: number; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-forest font-display text-lg text-white">{n}</span>
          <h2 className="font-display text-[26px] leading-tight text-forest-950">{title}</h2>
        </div>
        {children}
      </Card>
    </motion.section>
  );
}

function Formula({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl bg-forest-950 px-5 py-4 font-mono text-[14px] leading-relaxed text-sage whitespace-pre-wrap">{children}</pre>;
}

function summaryText(input: BarterInput, e: BarterEstimate, qty: number): string {
  const ratio = yieldRatio(e);
  const scale = qty / e.yield.baselineInputKg;
  const bal = mveBalance(e);
  return [
    `SYMBIO Upcycling & Barter Estimate (AI-generated, hypothetical)`,
    `${input.industryA} (${input.byproduct}) → ${input.industryB} (${input.finalProduct})`,
    ``,
    `1. Process: ${PROCESS_META[e.process.type].label}. ${e.process.summary}`,
    `2. Yield: ${e.yield.formula}`,
    `   ${fmtNumber(qty)} kg input → ~${fmtNumber(qty * ratio)} kg usable (${Math.round(ratio * 100)}%)`,
    `3. MVE (${e.mve.unit}): Do ${fmtNumber(e.mve.disposalOffset * scale, 1)}, Vo ${fmtNumber(e.mve.virginOffset * scale, 1)}, Pc ${fmtNumber(e.mve.processingCost * scale, 1)}; Vo − Pc = ${fmtNumber(bal.netToB * scale, 1)}`,
    `   ${e.mve.formula}`,
    ...e.mve.exchange.map((x) => `   B → A: ${x.item} (${x.quantity}) ≈ ${fmtNumber(x.valueVu * scale, 1)}`),
    `   Ratio: ${e.mve.ratio}`,
    `4. Risks: ${e.risks.map((r) => `${r.title} (mitigation: ${r.mitigation})`).join("; ")}`,
  ].join("\n");
}

export function BarterView() {
  const params = useSearchParams();
  const { toast } = useToast();
  const { state, me } = useApp();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [market, setMarket] = useState<{ data: BarterMarket; offerMaterial: string | null } | null>(null);
  const [form, setForm] = useState<Omit<BarterInput, "quantityKg"> & { quantity: string }>({
    industryA: params.get("a")?.slice(0, BARTER_LIMITS.text) ?? "",
    byproduct: params.get("ab")?.slice(0, BARTER_LIMITS.text) ?? "",
    industryB: params.get("b")?.slice(0, BARTER_LIMITS.text) ?? "",
    finalProduct: params.get("bp")?.slice(0, BARTER_LIMITS.text) ?? "",
    quantity: params.get("kg") && Number(params.get("kg")) > 0 ? String(Number(params.get("kg"))) : "1000",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ input: BarterInput; estimate: BarterEstimate } | null>(null);
  const [scaleKg, setScaleKg] = useState(1000);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(null); };

  /** Runs the pipeline for explicit input: stable matching (instant, local) then the AI estimate. */
  async function run(input: BarterInput) {
    if ([input.industryA, input.byproduct, input.industryB, input.finalProduct].some((v) => v.length < 2)) {
      setError("Fill in both industries, the byproduct and the final product (at least 2 characters each).");
      return;
    }
    if (!Number.isFinite(input.quantityKg) || input.quantityKg < BARTER_LIMITS.minKg || input.quantityKg > BARTER_LIMITS.maxKg) {
      setError("Batch size must be a number between 1 kg and 10,000 t.");
      return;
    }
    setError(null);
    const offer = offerFromInput(input, me, state);
    setMarket({ data: buildBarterMarket(state, offer ? [offer] : []), offerMaterial: offer?.materialId ?? null });
    setResult(null);
    setBusy(true);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    const r = await estimateBarter(input);
    setBusy(false);
    if (r.status !== "ok") {
      setError(r.message);
      toast("error", r.status === "unavailable" ? "Estimator unavailable" : "Estimate failed", r.message);
      return;
    }
    setResult({ input, estimate: r.estimate });
    setScaleKg(input.quantityKg);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const quantityKg = form.quantity.trim() === "" ? Number.NaN : Number(form.quantity);
    void run({ industryA: form.industryA.trim(), byproduct: form.byproduct.trim(), industryB: form.industryB.trim(), finalProduct: form.finalProduct.trim(), quantityKg });
  }

  /** Fills the form with a preset and runs the whole pipeline straight away. */
  function tryExample(example: (typeof EXAMPLES)[number]) {
    if (busy) return;
    const input: BarterInput = { industryA: example.industryA, byproduct: example.byproduct, industryB: example.industryB, finalProduct: example.finalProduct, quantityKg: example.quantityKg };
    setForm({ ...input, quantity: String(input.quantityKg) });
    void run(input);
  }

  const e = result?.estimate;
  const ratio = e ? yieldRatio(e) : 0;
  const scale = e ? scaleKg / e.yield.baselineInputKg : 1;
  const bal = e ? mveBalance(e) : null;
  const ProcessIcon = e ? PROCESS_META[e.process.type].icon : Scale;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Upcycling & barter estimator"
        title={<>Value a waste-to-resource exchange, <em className="italic text-emerald">without cash</em></>}
        description="Describe who supplies the byproduct and what the receiver makes. The estimator classifies the remanufacturing process, models usable yield, and builds a Material Value Equivalency (MVE) barter."
        actions={<Badge tone="green" icon={<Sparkles className="size-3" />}>Azure OpenAI · gpt-4o</Badge>}
      />

      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} noValidate className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
            <div role="group" aria-labelledby="ind-a" className="space-y-4 rounded-2xl bg-mist p-5">
              <p id="ind-a" className="eyebrow">Industry A · byproduct supplier</p>
              <TextField label="Industry" value={form.industryA} onChange={set("industryA")} placeholder="e.g. Furniture workshop" maxLength={BARTER_LIMITS.text} />
              <TextField label="Waste / byproduct" value={form.byproduct} onChange={set("byproduct")} placeholder="e.g. Untreated hardwood sawdust" maxLength={BARTER_LIMITS.text} />
            </div>
            <div className="hidden self-center lg:grid lg:size-12 lg:place-items-center lg:rounded-full lg:bg-sage-50 lg:text-forest" aria-hidden><ArrowRight className="size-5" /></div>
            <div role="group" aria-labelledby="ind-b" className="space-y-4 rounded-2xl bg-mist p-5">
              <p id="ind-b" className="eyebrow">Industry B · upcycling receiver</p>
              <TextField label="Industry" value={form.industryB} onChange={set("industryB")} placeholder="e.g. Mushroom farm" maxLength={BARTER_LIMITS.text} />
              <TextField label="Intended final product" value={form.finalProduct} onChange={set("finalProduct")} placeholder="e.g. Oyster mushroom substrate blocks" maxLength={BARTER_LIMITS.text} />
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <TextField label="Batch size (kg of byproduct)" type="number" inputMode="decimal" min={1} max={10_000_000} value={form.quantity} onChange={set("quantity")} className="sm:w-64" />
            <Button type="submit" size="lg" disabled={busy} icon={busy ? <Loader2 className="size-4 animate-spin" /> : <Scale className="size-4" />}>{busy ? "Engineering the estimate…" : "Estimate yield & barter"}</Button>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold text-muted">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex.label} type="button" disabled={busy} onClick={() => tryExample(ex)} className="focus-ring rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-[13px] font-medium hover:border-forest hover:text-forest disabled:opacity-50">{ex.label}</button>
              ))}
            </div>
          </div>
          {error && <Notice tone="red">{error}</Notice>}
        </form>
      </Card>

      <div ref={resultsRef} className="scroll-mt-6" />
      {market && <StableMatches market={market.data} offerMaterial={market.offerMaterial} />}

      {busy && (
        <div role="status" className="grid gap-4">
          <span className="sr-only">Generating estimate</span>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      )}

      {result && e && bal && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-muted"><strong className="text-ink">{result.input.industryA}</strong> ({result.input.byproduct}) → <strong className="text-ink">{result.input.industryB}</strong> ({result.input.finalProduct})</p>
            <Button size="sm" variant="secondary" icon={<Copy className="size-3.5" />} onClick={async () => {
              try { await navigator.clipboard.writeText(summaryText(result.input, e, scaleKg)); toast("success", "Summary copied"); } catch { toast("error", "Couldn't copy to clipboard"); }
            }}>Copy summary</Button>
          </div>

          <Section n={1} title="Process classification & feasibility">
            <div className="flex flex-col gap-5 md:flex-row">
              <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-sage-50 px-5 py-4 md:w-64">
                <ProcessIcon className="size-7 text-forest" aria-hidden />
                <div><p className="font-display text-[26px] leading-none text-forest-950">{PROCESS_META[e.process.type].label}</p><p className="mt-1 text-[12px] text-muted">{PROCESS_META[e.process.type].blurb}</p></div>
              </div>
              <div className="flex-1">
                <p className="text-[15px] leading-relaxed">{e.process.summary}</p>
                {e.process.mechanics.length > 0 && <ul className="mt-3 space-y-1.5 text-[14px] text-muted">{e.process.mechanics.map((m) => <li key={m} className="flex gap-2"><span className="text-emerald" aria-hidden>•</span>{m}</li>)}</ul>}
              </div>
            </div>
          </Section>

          <Section n={2} title="Upcycling yield estimation" delay={0.05}>
            <Formula>{e.yield.formula}</Formula>
            {e.yield.variables.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[13.5px]">
                  <thead><tr className="border-b border-line text-[12px] text-muted"><th className="pb-2 font-semibold">Variable</th><th className="pb-2 font-semibold">Meaning</th><th className="pb-2 text-right font-semibold">Baseline value</th></tr></thead>
                  <tbody className="divide-y divide-line">{e.yield.variables.map((v) => <tr key={v.symbol}><td className="py-2 font-mono text-forest">{v.symbol}</td><td className="py-2">{v.meaning}</td><td className="py-2 text-right tabular-nums">{v.value}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl bg-mist p-5">
                <label htmlFor="scale" className="label">Scale the batch: {fmtNumber(scaleKg)} kg</label>
                <input id="scale" type="range" min={Math.max(1, Math.round(result.input.quantityKg / 10))} max={Math.round(result.input.quantityKg * 10)} step={Math.max(1, Math.round(result.input.quantityKg / 100))} value={scaleKg} onChange={(ev) => setScaleKg(Number(ev.target.value))} className="mt-2 w-full accent-forest" />
                <p className="mt-2 text-[12px] text-muted">Assumes yield and values scale linearly with batch size.</p>
              </div>
              <div className="flex items-center justify-around rounded-2xl bg-forest p-5 text-center text-white">
                <div><p className="font-display text-[30px] leading-none">{fmtNumber(scaleKg)}</p><p className="mt-1 text-[12px] text-sage">kg byproduct in</p></div>
                <ArrowRight className="size-5 text-sage" aria-hidden />
                <div><p className="font-display text-[30px] leading-none">{fmtNumber(scaleKg * ratio)}</p><p className="mt-1 text-[12px] text-sage">kg usable out · {Math.round(ratio * 100)}%</p></div>
              </div>
            </div>
            {e.yield.explanation && <p className="mt-4 text-[14px] text-muted">{e.yield.explanation}</p>}
          </Section>

          <Section n={3} title="Barter valuation (MVE)" delay={0.1}>
            <p className="text-[13px] text-muted">Value unit: <strong className="text-ink">{e.mve.unit}</strong>. Figures shown for {fmtNumber(scaleKg)} kg.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { k: "Do", label: "Industry A · disposal offset", v: e.mve.disposalOffset, note: e.mve.disposalOffsetNote },
                { k: "Vo", label: "Industry B · virgin material offset", v: e.mve.virginOffset, note: e.mve.virginOffsetNote },
                { k: "Pc", label: "Industry B · processing cost", v: e.mve.processingCost, note: e.mve.processingCostNote },
              ].map((t) => (
                <div key={t.k} className="rounded-2xl border border-line p-4">
                  <p className="text-[12px] text-muted"><span className="font-mono font-semibold text-forest">{t.k}</span> · {t.label}</p>
                  <p className="mt-1 font-display text-[30px] leading-none text-forest-950">{fmtNumber(t.v * scale, 1)}</p>
                  {t.note && <p className="mt-2 text-[12px] text-muted">{t.note}</p>}
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              <Formula>{`Net value to B = Vo − Pc = ${fmtNumber(e.mve.virginOffset * scale, 1)} − ${fmtNumber(e.mve.processingCost * scale, 1)} = ${fmtNumber(bal.netToB * scale, 1)}\n${e.mve.formula}`}</Formula>
            </div>
            {e.mve.exchange.length > 0 && (
              <div className="mt-5">
                <h3 className="text-[13px] font-bold tracking-[0.1em] text-muted uppercase">What Industry B returns to Industry A</h3>
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
                  {e.mve.exchange.map((x) => (
                    <li key={x.item} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[14px]">
                      <span><strong>{x.item}</strong>{x.quantity && <span className="text-muted"> · {x.quantity}{scale !== 1 ? " (at baseline)" : ""}</span>}</span>
                      <span className="tabular-nums font-semibold text-forest">{fmtNumber(x.valueVu * scale, 1)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between bg-mist px-4 py-3 text-[14px] font-semibold"><span>Total returned to A</span><span className="tabular-nums">{fmtNumber(bal.returnTotal * scale, 1)}</span></li>
                </ul>
                <p className={cx("mt-3 text-[13px]", bal.surplus >= 0 ? "text-forest" : "text-error")}>
                  {bal.surplus >= 0
                    ? `Balance check: B keeps ${fmtNumber(bal.surplus * scale, 1)} of its net value after returning goods/services worth ${fmtNumber(bal.returnTotal * scale, 1)} to A (A also avoids disposal worth ${fmtNumber(e.mve.disposalOffset * scale, 1)}).`
                    : `Balance check: returns exceed B's net value by ${fmtNumber(-bal.surplus * scale, 1)}. Renegotiate the share before agreeing.`}
                </p>
              </div>
            )}
            {e.mve.ratio && <p className="mt-4 rounded-2xl bg-sage-50 px-4 py-3 text-[14px]"><strong>Proposed ratio:</strong> {e.mve.ratio}</p>}
          </Section>

          <Section n={4} title="Bottlenecks & failure modes" delay={0.15}>
            <div className="grid gap-4 md:grid-cols-3">
              {e.risks.map((r) => (
                <div key={r.title} className="flex flex-col rounded-2xl border border-line p-5">
                  <AlertTriangle className="size-5 text-gold" aria-hidden />
                  <h3 className="mt-3 font-semibold">{r.title}</h3>
                  <p className="mt-1 flex-1 text-[13px] text-muted">{r.detail}</p>
                  <p className="mt-3 flex gap-2 rounded-xl bg-sage-50 p-3 text-[13px] text-forest"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /><span><strong>Mitigation:</strong> {r.mitigation}</span></p>
                </div>
              ))}
            </div>
          </Section>

          <Notice>AI-generated engineering estimate with hypothetical values. Validate yields with a lab or pilot batch and agree barter terms in writing before any exchange.</Notice>
        </div>
      )}
    </div>
  );
}
