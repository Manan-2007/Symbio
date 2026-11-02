"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { BookOpen, CheckCircle2, Factory, FlaskConical, Loader2, PlugZap, RotateCcw, ScanSearch, UploadCloud, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/field";
import { MaterialArt } from "@/components/ui/visuals";
import { CATEGORIES } from "@/services/types";
import { CATEGORY_LABELS, MATERIALS, findMaterial } from "@/services/catalog";
import { classifyMaterialImage, materialGuidance } from "@/services/ai";
import type { ClassifierResult } from "@/services/ai";
import { useIntegrationStatus } from "@/hooks/use-integration-status";
import { resizeImage } from "@/utils/image";
import { cx } from "@/utils/format";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Phase =
  | { kind: "idle" }
  | { kind: "ready" }
  | { kind: "processing" }
  | { kind: "success"; result: Extract<ClassifierResult, { status: "ok" }> }
  | { kind: "no_match"; notes: string[] }
  | { kind: "error"; message: string; unavailable: boolean };

/** Procedural sawdust-like texture so the pipeline can be tested with one click (no download). */
async function sampleImage(): Promise<File> {
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = "#c9a26b";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const shade = 150 + Math.floor(rand() * 90);
    ctx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.78)}, ${Math.floor(shade * 0.5)})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 3, 1 + rand() * 2);
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not create the sample image.");
  return new File([blob], "sample-sawdust.jpg", { type: "image/jpeg" });
}

export default function ClassifierPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [materialId, setMaterialId] = useState("");
  const [dragging, setDragging] = useState(false);
  const status = useIntegrationStatus();
  const connected = status?.azureOpenAI.configured ?? false;
  const material = findMaterial(materialId);
  const guidance = material ? materialGuidance(material) : null;

  // Immediate preview from the original file. Each object URL is revoked when replaced, cleared or on unmount.
  const previewUrl = useRef<string | null>(null);
  const showFile = (next: File | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next ? URL.createObjectURL(next) : null;
    setFile(next);
    setPreview(previewUrl.current);
  };
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  function take(next: File | undefined) {
    if (!next) return;
    if (!ACCEPTED.includes(next.type)) {
      setPhase({ kind: "error", message: "Choose a JPG, PNG or WebP image.", unavailable: false });
      toast("error", "Unsupported file", "Choose a JPG, PNG or WebP image.");
      return;
    }
    showFile(next);
    setPhase({ kind: "ready" });
  }

  function clearImage() {
    showFile(null);
    setPhase({ kind: "idle" });
  }

  async function analyse(target = file) {
    if (!target) return;
    setPhase({ kind: "processing" });
    try {
      // Resized JPEG data URL (base64) keeps the request small; the server forwards it to the vision model.
      const dataUrl = await resizeImage(target, 720);
      const r = await classifyMaterialImage(dataUrl);
      if (r.status === "ok") { setPhase({ kind: "success", result: r }); setMaterialId(r.materialId); }
      else if (r.status === "no_match") setPhase({ kind: "no_match", notes: r.notes });
      else setPhase({ kind: "error", message: r.message, unavailable: r.status === "unavailable" });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : "The image could not be processed.", unavailable: false });
    }
  }

  async function runSample() {
    try {
      const sample = await sampleImage();
      showFile(sample);
      await analyse(sample);
    } catch (err) {
      toast("error", "Sample failed", err instanceof Error ? err.message : undefined);
    }
  }

  const busy = phase.kind === "processing";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI waste classifier"
        title="What is this material, and who could use it?"
        description="Upload a photo for classification, then get reuse routes, buyer industries and quality checks from the SYMBIO material catalogue."
        actions={<Badge tone={connected ? "green" : "gold"} icon={<PlugZap className="size-3" />}>{status === null ? "Checking AI service…" : connected ? "Azure OpenAI vision connected" : "AI service not connected"}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <h2 className="font-display text-[24px] text-forest-950">1 · Upload a photo</h2>
          <div
            onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files[0]); }}
            className={cx("relative mt-4 grid min-h-[260px] place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors", dragging ? "border-emerald bg-sage-50" : "border-line-strong bg-mist")}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview of a user-selected file */}
                <img src={preview} alt={`Uploaded material: ${file?.name ?? "photo"}`} className="absolute inset-0 size-full object-cover" />
                {busy && <div className="absolute inset-0 grid place-items-center bg-white/55 backdrop-blur-[1px]"><Loader2 className="size-7 animate-spin text-forest" aria-hidden /></div>}
                <button type="button" onClick={clearImage} disabled={busy} className="focus-ring absolute top-3 right-3 rounded-full bg-white/90 p-2 shadow-soft disabled:opacity-50" aria-label="Remove photo"><X className="size-4" /></button>
              </>
            ) : (
              <div className="p-6 text-center">
                <UploadCloud className="mx-auto size-8 text-forest" aria-hidden />
                <p className="mt-3 text-[14px] font-semibold">Drag a photo here</p>
                <p className="text-[13px] text-muted">JPG, PNG or WebP</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>Choose file</Button>
                  <Button variant="ghost" size="sm" icon={<FlaskConical className="size-4" />} onClick={runSample}>Try a sample image</Button>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => { take(e.target.files?.[0]); e.target.value = ""; }} aria-label="Choose a material photo" />
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" disabled={!file || busy} onClick={() => analyse()} icon={busy ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}>
              {busy ? "Analysing…" : phase.kind === "success" || phase.kind === "no_match" || phase.kind === "error" ? "Analyse again" : "Analyse photo"}
            </Button>
            {file && !busy && <Button variant="secondary" onClick={clearImage} icon={<RotateCcw className="size-4" />}>Reset</Button>}
          </div>
          <p className="mt-2 text-[12px] text-muted" role="status" aria-live="polite">
            Status: {{ idle: "waiting for a photo", ready: `ready · ${file?.name ?? ""}`, processing: "classifying…", success: "classified", no_match: "no catalogue match", error: "failed" }[phase.kind]}
          </p>
          {phase.kind === "error" && (phase.unavailable
            ? <Notice className="mt-3">{phase.message} Set <code>AZURE_OPENAI_API_KEY</code> and <code>AZURE_OPENAI_ENDPOINT</code> on the server to enable it.</Notice>
            : <Notice tone="red" className="mt-3">{phase.message}</Notice>)}
          {phase.kind === "no_match" && <Notice className="mt-3">The model couldn&apos;t match this photo to a catalogue material. {phase.notes.join(" ")} Choose the material yourself below.</Notice>}
          {phase.kind === "success" && (() => {
            const m = findMaterial(phase.result.materialId)!;
            const pct = Math.round(phase.result.confidence * 100);
            return (
              <div className="mt-3 rounded-2xl border border-sage bg-sage-50 p-4">
                <p className="text-[12px] font-bold tracking-[0.12em] text-muted uppercase">Predicted category</p>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-[26px] leading-tight text-forest-950">{m.name}</p>
                  <span className="text-[13px] font-semibold text-forest">{pct}% confidence</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden><div className="h-full rounded-full bg-gradient-to-r from-leaf to-emerald" style={{ width: `${pct}%` }} /></div>
                <p className="mt-3 text-[13px]"><strong>Suggested action:</strong> list it for {m.reuses[0].toLowerCase()} buyers ({m.industries.slice(0, 2).join(", ").toLowerCase()}), or estimate a barter.</p>
                {phase.result.notes.length > 0 && <ul className="mt-2 list-disc pl-4 text-[13px] text-muted">{phase.result.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <ButtonLink size="sm" href="/listings/new">List this material</ButtonLink>
                  <ButtonLink size="sm" variant="secondary" href={`/barter?${new URLSearchParams({ a: "Your company", ab: m.name, b: m.industries[0] ?? "Buyer", bp: m.reuses[0] ?? "Upcycled product" }).toString()}`}>Estimate barter</ButtonLink>
                </div>
                <p className="mt-2 text-[11.5px] text-muted">AI suggestion. Confirm the material on the right before relying on it.</p>
              </div>
            );
          })()}
          <p className="mt-4 text-[12px] text-muted">When you click Analyse, a resized copy of the photo is sent to Azure OpenAI through SYMBIO&apos;s server. AI output can be wrong; always confirm.</p>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-[24px] text-forest-950">2 · Confirm the material</h2>
          <SelectField label="Material" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="mt-4">
            <option value="">Choose a material…</option>
            {CATEGORIES.map((c) => (
              <optgroup key={c} label={CATEGORY_LABELS[c]}>
                {MATERIALS.filter((m) => m.category === c).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
            ))}
          </SelectField>

          {material && guidance ? (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-4">
                <MaterialArt category={material.category} className="size-20 shrink-0 rounded-2xl" />
                <div>
                  <p className="font-display text-[26px] leading-tight text-forest-950">{material.name}</p>
                  <p className="text-[13px] text-muted">{CATEGORY_LABELS[material.category]} · catalogue guidance, not AI analysis</p>
                </div>
              </div>
              <section>
                <h3 className="flex items-center gap-2 text-[13px] font-bold tracking-[0.1em] text-muted uppercase"><BookOpen className="size-4" /> Suggested reuse applications</h3>
                <div className="mt-2 flex flex-wrap gap-2">{guidance.reuses.map((r) => <Badge key={r} tone="green">{r}</Badge>)}</div>
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-[13px] font-bold tracking-[0.1em] text-muted uppercase"><Factory className="size-4" /> Potential buyer industries</h3>
                <p className="mt-2 text-[14px]">{guidance.industries.join(" · ")}</p>
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-[13px] font-bold tracking-[0.1em] text-muted uppercase"><CheckCircle2 className="size-4" /> Quality checks before listing</h3>
                <ul className="mt-2 space-y-1.5 text-[14px]">{guidance.checks.map((c) => <li key={c} className="flex gap-2"><span className="text-emerald" aria-hidden>•</span>{c}</li>)}</ul>
              </section>
              <div className="flex flex-wrap gap-2 border-t border-line pt-5">
                <ButtonLink href="/listings/new">List this material</ButtonLink>
                <ButtonLink href={`/marketplace?material=${material.id}`} variant="secondary">See similar listings</ButtonLink>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-[14px] text-muted">Choose a material to see recommendations. When a classifier is connected, its suggestion is pre-selected here for you to confirm.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
