"use client";

import { useState } from "react";
import { useDemo } from "./demo-provider";
import { calculateImpact, DEMO_FACTOR, IMPACT_NOTE, impactTotals } from "@/lib/impact";
import { MATERIAL_LABELS, businessName } from "@/lib/seed";
import { kg, number } from "@/lib/format";

export function CarbonDashboard({ onEnquiries }: { onEnquiries: () => void }) {
  const { state, selectedBusiness } = useDemo();
  const [scope, setScope] = useState("all");
  const [quantity, setQuantity] = useState("600");
  const [factor, setFactor] = useState(String(DEMO_FACTOR));
  const businessId = scope === "mine" ? selectedBusiness.id : undefined;
  const totals = impactTotals(state, businessId);
  const scenario = quantity.trim() && factor.trim() && Number(quantity) <= 1_000_000 && Number(factor) <= 100 ? calculateImpact(Number(quantity), 0, Number(factor)) : null;
  const records = state.diversions.flatMap((record) => {
    const enquiry = state.enquiries.find((e) => e.id === record.enquiryId)!;
    const listing = state.listings.find((l) => l.id === enquiry.listingId)!;
    return businessId && enquiry.buyerBusinessId !== businessId && listing.businessId !== businessId ? [] : [{ record, enquiry, listing }];
  });
  return <section className="flex flex-col gap-5" aria-labelledby="carbon-heading">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Waste diverted. Possibilities measured.</p><h2 id="carbon-heading" className="text-2xl font-bold">Carbon Offset Calculator</h2><p className="mt-1 text-sm text-muted">Estimated CO₂e avoidance from recorded demo reuse instead of landfill.</p></div>
      <label className="field">Dashboard scope<select value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">All demo businesses</option><option value="mine">{selectedBusiness.name}</option></select></label></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="card"><p className="text-sm text-muted">Recorded demo diversion</p><p className="mt-2 text-3xl font-bold">{kg(totals.quantityKg)}</p><p className="mt-2 text-xs text-muted">Material recorded as reused</p></div>
      <div className="card bg-green-50"><p className="text-sm text-primary">Illustrative CO₂e avoided</p><p className="mt-2 text-3xl font-bold text-primary">{number(totals.avoidedKgCO2e)} <span className="text-base">kgCO₂e</span></p><p className="mt-2 text-xs text-muted">Invented factor: 0.4 kgCO₂e/kg · not verified</p></div>
      <div className="card"><p className="text-sm text-muted">Demo reuse records</p><p className="mt-2 text-3xl font-bold">{totals.count}</p><p className="mt-2 text-xs text-muted">Enquiries alone contribute zero</p></div>
    </div>
    <p className="rounded-xl bg-notice p-4 text-sm text-notice-text">{IMPACT_NOTE} All reuse records are fictional. This dashboard does not establish real-world CO₂ savings or issue carbon credits.</p>
    <div className="card"><h3 className="text-lg font-bold">Explore a landfill-avoidance scenario</h3><p className="mt-1 text-sm text-muted">What if this quantity were reused? Changing these inputs does not change your recorded totals.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field">Potential reuse (kg)<input type="number" min="0" max="1000000" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label><label className="field">Assumed net benefit (kgCO₂e/kg)<input type="number" min="0" max="100" step="any" value={factor} onChange={(e) => setFactor(e.target.value)} /></label></div>
      <div role="status" className="mt-4 rounded-lg bg-canvas p-4">{scenario ? <><p className="text-2xl font-bold text-primary">{number(scenario.avoidedKgCO2e)} kgCO₂e</p><p className="text-sm text-muted">{number(scenario.quantityKg)} kg × {factor} kgCO₂e/kg · hypothetical avoidance</p></> : <p className="text-error">Enter finite values from 0–1,000,000 kg and 0–100 kgCO₂e/kg.</p>}</div>
      <p className="mt-3 text-xs text-muted">The default 0.4 is an invented demonstration assumption, shared across all materials. Any edited factor is your scenario assumption, not a validated factor. Net benefit represents the assumed difference between landfill and reuse; this demo does not model either pathway.</p>
    </div>
    <div className="card"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Demo reuse ledger</h3><button type="button" className="btn btn-secondary" onClick={onEnquiries}>Record reuse from an enquiry</button></div>
      {records.length === 0 ? <p className="mt-4 text-muted">No reuse recorded yet. Send an enquiry, then explicitly record demo reuse to populate this dashboard.</p> : <ul className="mt-4 divide-y divide-line">{records.map(({ record, enquiry, listing }) => <li key={record.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><p className="font-semibold">{MATERIAL_LABELS[listing.material]} · {kg(record.quantityKg)}</p><p className="text-muted">{businessName(listing.businessId)} → {businessName(enquiry.buyerBusinessId)} · {new Date(record.createdAt).toLocaleDateString("en-IN")}</p></div><p className="font-semibold text-primary">{number(record.quantityKg * DEMO_FACTOR)} kgCO₂e <span className="font-normal">(illustrative)</span></p></li>)}</ul>}
    </div>
  </section>;
}
