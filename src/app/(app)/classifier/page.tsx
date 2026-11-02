"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { BookOpen, CheckCircle2, Factory, Loader2, PlugZap, ScanSearch, UploadCloud, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/field";
import { MaterialArt } from "@/components/ui/visuals";
import { CATEGORIES } from "@/services/types";
import { CATEGORY_LABELS, MATERIALS, findMaterial } from "@/services/catalog";
import { classifyMaterialImage, materialGuidance } from "@/services/ai";
import type { ClassifierResult } from "@/services/ai";
import { integrations } from "@/services/integrations";
import { resizeImage } from "@/utils/image";
import { cx } from "@/utils/format";

export default function ClassifierPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClassifierResult | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [dragging, setDragging] = useState(false);
  const connected = Boolean(integrations.ai.classifierEndpoint);
  const material = findMaterial(materialId);
  const guidance = material ? materialGuidance(material) : null;

  async function take(file: File | undefined) {
    if (!file) return;
    try {
      setImage(await resizeImage(file, 720));
      setResult(null);
    } catch (err) {
      toast("error", "Image not added", err instanceof Error ? err.message : undefined);
    }
  }

  async function analyse() {
    if (!image) return;
    setBusy(true);
    const r = await classifyMaterialImage(image);
    setResult(r);
    if (r.status === "ok") setMaterialId(r.materialId);
    setBusy(false);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI waste classifier"
        title="What is this material, and who could use it?"
        description="Upload a photo for classification, then get reuse routes, buyer industries and quality checks from the SYMBIO material catalogue."
        actions={<Badge tone={connected ? "green" : "gold"} icon={<PlugZap className="size-3" />}>{connected ? "Classifier connected" : "AI service not connected"}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <h2 className="font-display text-[24px] text-forest-950">1 · Upload a photo</h2>
          <div
            onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); void take(e.dataTransfer.files[0]); }}
            className={cx("relative mt-4 grid min-h-[260px] place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors", dragging ? "border-emerald bg-sage-50" : "border-line-strong bg-mist")}
          >
            {image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a user-selected file */}
                <img src={image} alt="Uploaded material" className="absolute inset-0 size-full object-cover" />
                <button type="button" onClick={() => { setImage(null); setResult(null); }} className="focus-ring absolute top-3 right-3 rounded-full bg-white/90 p-2 shadow-soft" aria-label="Remove photo"><X className="size-4" /></button>
              </>
            ) : (
              <div className="p-6 text-center">
                <UploadCloud className="mx-auto size-8 text-forest" aria-hidden />
                <p className="mt-3 text-[14px] font-semibold">Drag a photo here</p>
                <p className="text-[13px] text-muted">JPG, PNG or WebP</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => fileRef.current?.click()}>Choose file</Button>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => { void take(e.target.files?.[0]); e.target.value = ""; }} aria-label="Choose a material photo" />
          <Button className="mt-4 w-full" disabled={!image || busy} onClick={analyse} icon={busy ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}>
            {busy ? "Analysing…" : "Analyse photo"}
          </Button>
          {result?.status === "unavailable" && <Notice className="mt-4">{result.message} Set <code>NEXT_PUBLIC_AI_CLASSIFIER_ENDPOINT</code> to connect a service.</Notice>}
          {result?.status === "error" && <Notice tone="red" className="mt-4">{result.message}</Notice>}
          {result?.status === "ok" && (
            <Notice tone="green" className="mt-4">
              Classifier suggests <strong>{findMaterial(result.materialId)?.name}</strong> ({Math.round(result.confidence * 100)}% confidence). Confirm below before relying on it.
            </Notice>
          )}
          <p className="mt-4 text-[12px] text-muted">Photos stay in your browser unless a classifier service is configured.</p>
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
