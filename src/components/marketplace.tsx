"use client";

import { useState } from "react";
import { useDemo } from "./demo-provider";
import { ListingForm } from "./listing-form";
import { CITIES, MATERIALS } from "@/lib/types";
import { MATERIAL_LABELS, REQUIREMENTS, businessName } from "@/lib/seed";
import { matchListing } from "@/lib/matching";
import { kg, pricePerKg } from "@/lib/format";

export function Marketplace({ onFindFit }: { onFindFit: (listingId: string) => void }) {
  const { state, selectedBusiness } = useDemo();
  const [material, setMaterial] = useState("");
  const [city, setCity] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const listings = state.listings.filter((l) => (!material || material === l.material) && (!city || city === l.city));
  return <section className="flex flex-col gap-4" aria-labelledby="marketplace-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="marketplace-heading" className="text-xl font-bold">Available surplus</h2><p className="text-sm text-muted">Resources looking for their next purpose.</p></div>
      <button type="button" className="btn btn-primary" onClick={() => { setAdding(!adding); setMessage(""); }}>{adding ? "Close form" : "+ Add listing"}</button></div>
    {adding && <ListingForm key={selectedBusiness.id} onCancel={() => setAdding(false)} onAdded={() => { setAdding(false); setMaterial(""); setCity(""); setMessage("Listing published. It’s now visible in the marketplace."); }} />}
    {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-primary">{message}</p>}
    <div className="card grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="field">Material<select value={material} onChange={(e) => setMaterial(e.target.value)}><option value="">All materials</option>{MATERIALS.map((m) => <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>)}</select></label>
      <label className="field">Locality<select value={city} onChange={(e) => setCity(e.target.value)}><option value="">All localities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <button type="button" className="btn btn-secondary" onClick={() => { setMaterial(""); setCity(""); }}>Clear filters</button>
    </div>
    <p className="text-sm text-muted" role="status">Showing {listings.length} of {state.listings.length} listings</p>
    {listings.length === 0 ? <p className="card text-muted">No surplus matches these filters. Try another material or locality.</p> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => {
      const fits = REQUIREMENTS.filter((r) => matchListing(listing, r));
      return <li className="card flex flex-col gap-3" key={listing.id}>
        <div><p className="text-sm font-semibold uppercase tracking-wide text-primary">{MATERIAL_LABELS[listing.material]}</p><h3 className="text-lg font-bold">{businessName(listing.businessId)}</h3></div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm"><dt className="text-muted">Listed lot</dt><dd className="font-semibold">{kg(listing.quantityKg)}</dd><dt className="text-muted">Locality</dt><dd>{listing.city}</dd><dt className="text-muted">Price</dt><dd>{pricePerKg(listing.pricePerKg)}</dd></dl>
        <p className="text-xs text-muted">Clean, sorted and untreated: supplier declaration, not verified.</p>
        <button type="button" className="btn btn-secondary mt-auto" onClick={() => onFindFit(listing.id)}>Find buyer fit</button>
        <p className="text-xs text-muted">{fits.length ? `${fits.length} compatible demo buyer` : "No eligible demo buyer yet"}</p>
      </li>;
    })}</ul>}
  </section>;
}
