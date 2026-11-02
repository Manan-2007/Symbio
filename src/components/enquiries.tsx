"use client";

import { useState, type FormEvent } from "react";
import { useDemo } from "./demo-provider";
import { MATERIAL_LABELS, businessName } from "@/lib/seed";
import { kg } from "@/lib/format";

export function Enquiries({ onMatches, onCarbon }: { onMatches: () => void; onCarbon: () => void }) {
  const { state, selectedBusiness, recordDiversion } = useDemo();
  const [message, setMessage] = useState("");
  const mine = state.enquiries.flatMap((enquiry) => {
    const listing = state.listings.find((l) => l.id === enquiry.listingId)!;
    const isBuyer = enquiry.buyerBusinessId === selectedBusiness.id;
    if (!isBuyer && listing.businessId !== selectedBusiness.id) return [];
    return [{ enquiry, listing, isBuyer, diversion: state.diversions.find((d) => d.enquiryId === enquiry.id) }];
  });
  function record(event: FormEvent<HTMLFormElement>, enquiryId: string) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get("quantity") ?? "").trim();
    const result = recordDiversion(enquiryId, raw ? Number(raw) : NaN);
    setMessage(result.ok ? "Demo reuse recorded. The carbon dashboard now includes this quantity once." : result.error);
  }
  return <section className="flex flex-col gap-4" aria-labelledby="enquiries-heading">
    <div><h2 id="enquiries-heading" className="text-xl font-bold">Enquiries</h2><p className="text-sm text-muted">Involving {selectedBusiness.name}. Sending an enquiry does not reserve stock or mean material was transferred.</p></div>
    {message && <p role="status" className="card">{message}</p>}
    {mine.length === 0 ? <div className="card"><p className="text-muted">No enquiries yet. Find a match to start.</p><button type="button" onClick={onMatches} className="btn btn-primary mt-3">Find matches</button></div> : <ul className="flex flex-col gap-4">{mine.map(({ enquiry, listing, isBuyer, diversion }) => <li key={enquiry.id} className="card flex flex-col gap-3">
      <div><h3 className="font-bold">{MATERIAL_LABELS[listing.material]} · {kg(enquiry.quantityKg)}</h3><p className="text-sm text-muted">{isBuyer ? "To" : "From"} {businessName(isBuyer ? listing.businessId : enquiry.buyerBusinessId)} · {new Date(enquiry.createdAt).toLocaleDateString("en-IN")} · Enquiry sent</p></div>
      {diversion ? <div className="rounded-lg bg-green-50 p-3 text-primary"><p>Demo reuse recorded: {kg(diversion.quantityKg)} · {new Date(diversion.createdAt).toLocaleDateString("en-IN")}</p><button type="button" className="btn btn-secondary mt-2" onClick={onCarbon}>View carbon dashboard</button></div> : <details className="rounded-lg border border-line p-3"><summary className="cursor-pointer py-2 font-semibold">Record demo reuse</summary>
        <p className="my-3 text-sm text-muted">Simulate this material being reused instead of landfilled. This is a fictional, one-time record per enquiry, not proof of a real transfer. Combined records cannot exceed the original lot or buyer requirement.</p>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => record(event, enquiry.id)}>
          <label className="field">Reused quantity (kg)<input type="number" name="quantity" required min="0.001" max={enquiry.quantityKg} step="0.001" defaultValue={enquiry.quantityKg} /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" required className="h-5 w-5" />I’m recording fictional demo reuse.</label>
          <button type="submit" className="btn btn-primary">Save demo reuse</button>
        </form>
      </details>}
    </li>)}</ul>}
  </section>;
}
