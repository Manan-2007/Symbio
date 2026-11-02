"use client";

import { useRef, useState } from "react";
import { useDemo } from "./demo-provider";
import { MATERIAL_LABELS, REQUIREMENTS, businessName, requirementsFor } from "@/lib/seed";
import { matchListing, rankMatches } from "@/lib/matching";
import { calculateImpact, IMPACT_NOTE } from "@/lib/impact";
import { kg, money, number } from "@/lib/format";

export function Matches({ listingId, onClear, onEnquiries }: { listingId: string | null; onClear: () => void; onEnquiries: () => void }) {
  const { state, selectedBusiness, selectBusiness, sendEnquiry } = useDemo();
  const [requirementId, setRequirementId] = useState("");
  const [message, setMessage] = useState("");
  // A repeat click can land before the disabled button re-renders; keep its
  // duplicate error from replacing the success notice.
  const lastSent = useRef<string | null>(null);
  const requirements = requirementsFor(selectedBusiness.id);
  const requirement = requirements.find((r) => r.id === requirementId) ?? requirements[0];
  const focused = state.listings.find((l) => l.id === listingId);
  const buyers = focused ? REQUIREMENTS.filter((r) => matchListing(focused, r)) : REQUIREMENTS;
  const candidates = focused ? [focused] : state.listings;
  const matches = requirement ? rankMatches(candidates, requirement) : [];

  return <section className="flex flex-col gap-4" aria-labelledby="matches-heading">
    <div><h2 id="matches-heading" className="text-xl font-bold">Find a useful connection</h2><p className="text-sm text-muted">Exact material fit, usable quantity, and approximate straight-line distance.</p></div>
    {focused && <div className="card flex flex-wrap items-center justify-between gap-3"><p>Buyer fit for {businessName(focused.businessId)} · {MATERIAL_LABELS[focused.material]} · {kg(focused.quantityKg)}</p><button type="button" className="btn btn-secondary" onClick={onClear}>Show all supply</button></div>}
    <div className="card flex flex-col gap-3">
      <p className="text-sm text-muted">Explore a buyer profile. Switching changes the demo business you act as.</p>
      <div className="flex flex-wrap gap-2">{buyers.map((r) => <button key={r.id} type="button" className={`btn ${r.businessId === selectedBusiness.id ? "btn-primary" : "btn-secondary"}`} onClick={() => { selectBusiness(r.businessId); setRequirementId(r.id); setMessage(""); }}>{businessName(r.businessId)}</button>)}</div>
      {!buyers.length && <p>No buyer meets this lot’s material, minimum quantity and distance rules.</p>}
      {requirement ? <><label className="field">Buyer requirement<select value={requirement.id} onChange={(e) => { setRequirementId(e.target.value); setMessage(""); }}>{requirements.map((r) => <option value={r.id} key={r.id}>{MATERIAL_LABELS[r.material]} · {kg(r.requiredKg)}</option>)}</select></label>
        <p className="text-sm text-muted">{selectedBusiness.name} · {requirement.city} · minimum {kg(requirement.minimumKg)} · radius {requirement.maxDistanceKm} km</p></> : <p>{selectedBusiness.name} has no buyer requirement. Choose a buyer above to view ranked supply.</p>}
    </div>
    {message && <div role="status" className="card"><p>{message}</p><button type="button" className="btn btn-secondary mt-2" onClick={onEnquiries}>View enquiries</button></div>}
    {requirement && matches.length === 0 && <p className="card text-muted">No eligible supply for this requirement. Try another buyer or browse all supply.</p>}
    <ul className="grid gap-4 md:grid-cols-2">{matches.map((match) => {
      const impact = calculateImpact(match.usableKg, match.listing.pricePerKg)!;
      const sent = state.enquiries.some((e) => e.listingId === match.listing.id && e.buyerBusinessId === selectedBusiness.id);
      return <li key={match.listing.id} className="card flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-primary">{MATERIAL_LABELS[match.listing.material]}</p><h3 className="text-lg font-bold">{businessName(match.listing.businessId)}</h3></div><div className="rounded-lg bg-green-50 px-3 py-2 text-primary"><strong className="text-xl">{match.score}</strong><span className="text-xs"> /100</span><p className="text-xs">Match score</p></div></div>
        <ul className="flex flex-col gap-1 text-sm text-muted">{match.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul>
        <p className="text-xs text-muted">Synthetic locality points; approximate straight-line distance, not a road route.</p>
        <dl className="grid grid-cols-2 gap-2 rounded-lg bg-canvas p-3 text-sm"><dt>Potential reuse</dt><dd className="text-right font-semibold">{kg(impact.quantityKg)}</dd><dt>Indicative purchase value</dt><dd className="text-right font-semibold">{money(impact.valueINR)}</dd><dt>Potential CO₂e avoidance</dt><dd className="text-right font-semibold">{number(impact.avoidedKgCO2e)} kgCO₂e</dd></dl>
        <p className="text-xs text-muted">{IMPACT_NOTE}</p>
        <button type="button" disabled={sent} className="btn btn-primary mt-auto" onClick={() => { const result = sendEnquiry({ listingId: match.listing.id, requirementId: requirement.id }); if (!result.ok && lastSent.current === match.listing.id) return; setMessage(result.ok ? `Enquiry sent to ${businessName(match.listing.businessId)} for ${kg(result.value.quantityKg)}. No stock reserved or reuse recorded.` : result.error); if (result.ok) lastSent.current = match.listing.id; }}>{sent ? "Enquiry already sent" : "Send enquiry"}</button>
      </li>;
    })}</ul>
  </section>;
}
