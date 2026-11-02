"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/primitives";
import { ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { MaterialArt } from "@/components/ui/visuals";
import { CATEGORIES } from "@/services/types";
import type { Contamination, QualityGrade, Unit } from "@/services/types";
import { CATEGORY_LABELS, CITIES, CONTAMINATION_LABELS, MATERIALS, QUALITY_LABELS, findMaterial } from "@/services/catalog";
import { estimateCo2eKg } from "@/services/carbonCalculator";
import { parseNumber } from "@/services/validation";
import { resizeImage } from "@/utils/image";
import { fmtCo2e, fmtInr } from "@/utils/format";

function AddListingForm() {
  const { me, addListing } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const company = me!;
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("wood");
  const [materialId, setMaterialId] = useState("sawdust");
  const [unit, setUnit] = useState<Unit>("kg");
  const [quality, setQuality] = useState<QualityGrade>("A");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!company.roles.includes("generator")) {
    return (
      <EmptyState title="Listings are for waste generators" action={<ButtonLink href="/onboarding">Add the generator role</ButtonLink>}>
        {company.name} is registered as a consumer. Add the Waste Generator role in your profile to list materials, or publish a requirement instead.
      </EmptyState>
    );
  }

  const materials = MATERIALS.filter((m) => m.category === category);
  const qtyKg = parseNumber(quantity) * (unit === "tonne" ? 1000 : 1);
  const preview = Number.isFinite(qtyKg) && qtyKg > 0 ? qtyKg : 0;

  async function onImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageBusy(true);
    try {
      setImage(await resizeImage(file));
    } catch (err) {
      toast("error", "Image not added", err instanceof Error ? err.message : undefined);
    } finally {
      setImageBusy(false);
      e.target.value = "";
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const r = addListing({
      materialId, title: data.get("title"), description: data.get("description"), quantity: parseNumber(quantity), unit,
      pricePerKg: parseNumber(price), cityId: data.get("cityId"), quality, moisturePct: parseNumber(data.get("moisture")),
      contamination: data.get("contamination"), availability: data.get("availability"), imageDataUrl: image,
    });
    if (!r.ok) {
      setError(r.error);
      toast("error", "Please check the form", r.error);
      return;
    }
    toast("success", "Listing published", "It's live in the marketplace and the matching engine.");
    router.push(`/marketplace/${r.value.id}`);
  }

  return (
    <form onSubmit={submit} noValidate onChange={() => setError(null)} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Card className="space-y-5 p-7">
          <h2 className="font-display text-[24px] text-forest-950">Material</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Category" value={category} onChange={(e) => { const c = e.target.value as typeof category; setCategory(c); setMaterialId(MATERIALS.find((m) => m.category === c)!.id); }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </SelectField>
            <SelectField label="Material" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </SelectField>
          </div>
          <TextField name="title" label="Listing title" placeholder={findMaterial(materialId)?.name} maxLength={120} hint="Optional. Defaults to the material name." />
          <TextAreaField name="description" label="Description" maxLength={1000} placeholder="Source process, packaging, collection notes…" />
        </Card>

        <Card className="space-y-5 p-7">
          <h2 className="font-display text-[24px] text-forest-950">Quantity, price & location</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <TextField label="Quantity" type="number" inputMode="decimal" min={0.001} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <ChoiceGroup label="Unit" name="unit" value={unit} options={[{ value: "kg", label: "kg" }, { value: "tonne", label: "tonnes" }]} onChange={setUnit} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Price (₹ per kg)" type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} hint="Enter 0 to offer it free" required />
            <SelectField name="cityId" label="Location" defaultValue={company.cityId}>
              {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
            </SelectField>
          </div>
          <SelectField name="availability" label="Availability" defaultValue="immediate">
            <option value="immediate">Available now</option>
            <option value="weekly">Weekly supply</option>
            <option value="monthly">Monthly supply</option>
            <option value="one_time">One-time lot</option>
          </SelectField>
        </Card>

        <Card className="space-y-5 p-7">
          <h2 className="font-display text-[24px] text-forest-950">Quality data</h2>
          <ChoiceGroup label="Material quality" name="quality" value={quality} options={(["A", "B", "C"] as const).map((q) => ({ value: q, label: QUALITY_LABELS[q] }))} onChange={setQuality} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="moisture" label="Moisture (%)" type="number" inputMode="decimal" min={0} max={100} step="0.1" defaultValue="10" />
            <SelectField name="contamination" label="Contamination" defaultValue="none">
              {(Object.keys(CONTAMINATION_LABELS) as Contamination[]).map((c) => <option key={c} value={c}>{CONTAMINATION_LABELS[c]}</option>)}
            </SelectField>
          </div>
          <p className="text-[12.5px] text-muted">Buyers filter on these values; matches with too much moisture or contamination are rejected automatically.</p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden lg:sticky lg:top-6">
          <div className="relative h-56">
            <MaterialArt category={findMaterial(materialId)!.category} imageUrl={image} alt="Listing photo preview" className="h-full" />
            {imageBusy && <div className="absolute inset-0 grid place-items-center bg-white/60"><Loader2 className="size-6 animate-spin text-forest" /></div>}
          </div>
          <div className="space-y-4 p-6">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onImage} id="listing-image" />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" icon={image ? <ImagePlus className="size-4" /> : <UploadCloud className="size-4" />} onClick={() => fileRef.current?.click()}>{image ? "Replace photo" : "Upload photo"}</Button>
              {image && <Button variant="ghost" aria-label="Remove photo" onClick={() => setImage(null)} icon={<Trash2 className="size-4" />} />}
            </div>
            <p className="text-[12px] text-muted">JPG, PNG or WebP. Resized in your browser and stored locally (demo).</p>
            <div className="rounded-2xl bg-mist p-4 text-[13px]">
              <p className="flex justify-between"><span className="text-muted">Lot value</span><span className="font-semibold">{preview && Number.isFinite(parseNumber(price)) ? fmtInr(preview * parseNumber(price)) : "—"}</span></p>
              <p className="mt-1.5 flex justify-between"><span className="text-muted">If fully reused</span><span className="font-semibold text-forest">{preview ? fmtCo2e(estimateCo2eKg(materialId, preview)) : "—"}</span></p>
              <p className="mt-2 text-[11.5px] text-muted">Illustrative CO₂e factor; not a certified figure.</p>
            </div>
            {error && <Notice tone="red">{error}</Notice>}
            <Button type="submit" size="lg" className="w-full">Publish listing</Button>
          </div>
        </Card>
      </div>
    </form>
  );
}

export default function AddListingPage() {
  return (
    <RequireAuth title="Sign in to list materials">
      <div className="space-y-8">
        <PageHeader eyebrow="New listing" title="List a by-product" description="Describe what you generate. Accurate quality data gets better matches and fewer rejected loads." />
        <AddListingForm />
      </div>
    </RequireAuth>
  );
}

