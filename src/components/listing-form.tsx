"use client";

import { useState, type FormEvent } from "react";
import { useDemo } from "./demo-provider";
import { CITIES, MATERIALS, type Material } from "@/lib/types";
import { MATERIAL_LABELS } from "@/lib/seed";

const declarations: Record<Material, string> = {
  sawdust: "This sawdust is clean, sorted and from untreated wood.",
  cotton_offcuts: "These cotton offcuts are clean, sorted and untreated.",
  cardboard: "This cardboard is clean, dry, sorted and untreated.",
};

export function ListingForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const { addListing, selectedBusiness } = useDemo();
  const [material, setMaterial] = useState<Material>("sawdust");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const quantity = String(data.get("quantity") ?? "").trim();
    const price = String(data.get("price") ?? "").trim();
    if (!quantity || !price) { setError("Enter a quantity and price. Use 0 for free material."); return; }
    const result = addListing({ material: data.get("material"), quantityKg: Number(quantity), pricePerKg: Number(price),
      city: data.get("city"), cleanUntreated: data.get("declaration") === "on" });
    if (!result.ok) { setError(result.error); return; }
    event.currentTarget.reset();
    onAdded();
  }

  return <form onSubmit={submit} className="card flex flex-col gap-4" aria-labelledby="listing-form-heading">
    <div><h3 id="listing-form-heading" className="text-lg font-bold">List surplus from {selectedBusiness.name}</h3>
      <p className="text-sm text-muted">Give another business a useful starting point. All listings are demo data.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="field">Material<select name="material" value={material} onChange={(e) => setMaterial(e.target.value as Material)}>
        {MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}</select></label>
      <label className="field">Locality<select name="city" defaultValue={selectedBusiness.city}>{CITIES.map((city) => <option key={city}>{city}</option>)}</select></label>
      <label className="field">Quantity (kg)<input name="quantity" type="number" required min="0.001" max="1000000" step="0.001" placeholder="e.g. 1000" /></label>
      <label className="field">Price (₹/kg)<input name="price" type="number" required min="0" max="1000000" step="0.01" placeholder="0 for free" /></label>
    </div>
    <label className="flex min-h-11 items-center gap-3"><input key={material} name="declaration" type="checkbox" required className="h-5 w-5 shrink-0" />{declarations[material]}</label>
    <p className="text-sm text-muted">Supplier self-declaration; Symbio has not verified material quality.</p>
    {error && <p role="alert" className="text-error">{error}</p>}
    <div className="flex flex-wrap gap-2"><button className="btn btn-primary" type="submit">Publish listing</button><button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}
