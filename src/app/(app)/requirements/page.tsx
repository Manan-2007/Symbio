"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, ClipboardList, MapPin, PlusCircle, Truck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/ui/primitives";
import { ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { CATEGORIES } from "@/services/types";
import type { Contamination, DeliveryPreference, QualityGrade } from "@/services/types";
import { CATEGORY_LABELS, CITIES, CONTAMINATION_LABELS, MATERIALS, QUALITY_LABELS, cityName, materialName } from "@/services/catalog";
import { matchesForRequirement } from "@/services/matchingEngine";
import { parseNumber } from "@/services/validation";
import { fmtDate, fmtKg, fmtPricePerKg } from "@/utils/format";

const DELIVERY_LABELS: Record<DeliveryPreference, string> = { pickup: "We collect", delivery: "Supplier delivers", either: "Either" };

function RequirementForm({ onDone }: { onDone: () => void }) {
  const { me, addRequirement } = useApp();
  const { toast } = useToast();
  const [delivery, setDelivery] = useState<DeliveryPreference>("either");
  const [minQuality, setMinQuality] = useState<QualityGrade>("B");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const moistureRaw = String(d.get("moisture") ?? "").trim();
    const r = addRequirement({
      materialId: d.get("materialId"), quantityKg: parseNumber(d.get("quantity")), maxBudgetPerKg: parseNumber(d.get("budget")),
      cityId: d.get("cityId"), maxDistanceKm: parseNumber(d.get("radius")), minQuality, maxContamination: d.get("contamination"),
      maxMoisturePct: moistureRaw === "" ? null : Number(moistureRaw), delivery, notes: d.get("notes"),
    });
    if (!r.ok) return setError(r.error);
    toast("success", "Requirement published", "Matching suppliers are ranked in Smart matches.");
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate onChange={() => setError(null)} className="space-y-4">
      <SelectField name="materialId" label="Material required" defaultValue="sawdust">
        {CATEGORIES.map((c) => (
          <optgroup key={c} label={CATEGORY_LABELS[c]}>
            {MATERIALS.filter((m) => m.category === c).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </optgroup>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="quantity" label="Quantity needed (kg)" type="number" inputMode="decimal" min={0.001} step="any" required />
        <TextField name="budget" label="Maximum budget (₹/kg)" type="number" inputMode="decimal" min={0} step="0.01" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="cityId" label="Preferred location" defaultValue={me?.cityId}>
          {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <TextField name="radius" label="Search radius (km)" type="number" inputMode="numeric" min={1} max={3000} defaultValue="150" hint="Straight-line distance" />
      </div>
      <ChoiceGroup label="Minimum quality" name="minQuality" value={minQuality} options={(["A", "B", "C"] as const).map((q) => ({ value: q, label: `Grade ${q}` }))} onChange={setMinQuality} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="contamination" label="Maximum contamination" defaultValue="low">
          {(Object.keys(CONTAMINATION_LABELS) as Contamination[]).map((c) => <option key={c} value={c}>{CONTAMINATION_LABELS[c]}</option>)}
        </SelectField>
        <TextField name="moisture" label="Maximum moisture (%)" type="number" inputMode="decimal" min={0} max={100} placeholder="No limit" />
      </div>
      <ChoiceGroup label="Delivery preference" name="delivery" value={delivery} options={(Object.keys(DELIVERY_LABELS) as DeliveryPreference[]).map((v) => ({ value: v, label: DELIVERY_LABELS[v] }))} onChange={setDelivery} />
      <TextAreaField name="notes" label="Quality specifications & notes" maxLength={1000} placeholder="e.g. untreated hardwood only, no MDF" />
      {error && <Notice tone="red">{error}</Notice>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit">Publish requirement</Button>
      </div>
    </form>
  );
}

function Requirements() {
  const { state, me, setRequirementStatus } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const company = me!;
  const mine = state.requirements.filter((r) => r.companyId === company.id);
  const canPublish = company.roles.includes("consumer");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Material requirements"
        title="What your operation needs"
        description="Publish specifications once. The engine continuously ranks suppliers by material fit, quantity, distance and price."
        actions={canPublish ? <Button icon={<PlusCircle className="size-4" />} onClick={() => setOpen(true)}>New requirement</Button> : undefined}
      />
      {!canPublish && (
        <Notice>{company.name} is registered as a generator. <Link href="/onboarding" className="font-semibold underline">Add the Waste Consumer role</Link> to publish requirements.</Notice>
      )}
      {mine.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-5" />} title="No requirements yet" action={canPublish ? <Button onClick={() => setOpen(true)}>Publish your first requirement</Button> : undefined}>
          Tell suppliers which secondary raw materials you buy, and how much.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {mine.map((r) => {
            const matches = r.status === "open" ? matchesForRequirement(r, state.listings) : [];
            return (
              <Card key={r.id} className="flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-[26px] leading-tight text-forest-950">{materialName(r.materialId)}</h2>
                    <p className="text-[13px] text-muted">Published {fmtDate(r.createdAt)}</p>
                  </div>
                  <Badge tone={r.status === "open" ? "green" : "neutral"}>{r.status === "open" ? "Open" : "Closed"}</Badge>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-xl bg-mist p-3"><dt className="text-muted">Quantity</dt><dd className="font-semibold">{fmtKg(r.quantityKg)}</dd></div>
                  <div className="rounded-xl bg-mist p-3"><dt className="text-muted">Budget</dt><dd className="font-semibold">{fmtPricePerKg(r.maxBudgetPerKg)}</dd></div>
                  <div className="rounded-xl bg-mist p-3"><dt className="text-muted">Quality</dt><dd className="font-semibold">{QUALITY_LABELS[r.minQuality].split(" · ")[0]} or better</dd></div>
                  <div className="rounded-xl bg-mist p-3"><dt className="text-muted">Contamination</dt><dd className="font-semibold">≤ {CONTAMINATION_LABELS[r.maxContamination]}</dd></div>
                </dl>
                <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{cityName(r.cityId)} · {r.maxDistanceKm} km radius</span>
                  <span className="inline-flex items-center gap-1"><Truck className="size-3.5" aria-hidden />{DELIVERY_LABELS[r.delivery]}</span>
                  {r.maxMoisturePct !== null && <span>Moisture ≤ {r.maxMoisturePct}%</span>}
                </p>
                {r.notes && <p className="mt-3 text-[13px] italic text-ink/80">“{r.notes}”</p>}
                <div className="flex-1 pb-5" />
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  {r.status === "open" ? (
                    <ButtonLink href={`/matches?req=${r.id}`} size="sm" iconRight={<ArrowRight className="size-3.5" />}>{matches.length} match{matches.length === 1 ? "" : "es"}</ButtonLink>
                  ) : <span className="text-[13px] text-muted">Not matching while closed</span>}
                  <Button size="sm" variant="ghost" onClick={() => { const res = setRequirementStatus(r.id, r.status === "open" ? "closed" : "open"); toast(res.ok ? "success" : "error", res.ok ? (r.status === "open" ? "Requirement closed" : "Requirement reopened") : res.error); }}>
                    {r.status === "open" ? "Close" : "Reopen"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Publish a material requirement" description="Suppliers outside your quality, contamination or radius limits are never shown." size="lg">
        {open && <RequirementForm onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}

export default function RequirementsPage() {
  return <RequireAuth title="Sign in to manage requirements"><Requirements /></RequireAuth>;
}
