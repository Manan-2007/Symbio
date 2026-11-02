"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { materialName } from "@/services/catalog";
import { parseNumber } from "@/services/validation";
import type { Listing } from "@/services/types";
import { fmtInr, fmtKg } from "@/utils/format";

/** "Contact seller" / "Request connection": opens a purchase request that starts a negotiation thread. */
export function RequestModal({ open, onClose, listing, requirementId = null, defaultKg, defaultPrice }: {
  open: boolean; onClose: () => void; listing: Listing; requirementId?: string | null; defaultKg?: number; defaultPrice?: number;
}) {
  const { requestDeal, state } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(String(defaultKg ?? listing.quantityKg));
  const [price, setPrice] = useState(String(defaultPrice ?? listing.pricePerKg));
  const seller = state.companies.find((c) => c.id === listing.companyId);
  const total = parseNumber(qty) * parseNumber(price);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const note = String(new FormData(e.currentTarget).get("note") ?? "");
    const r = await requestDeal({ listingId: listing.id, requirementId, quantityKg: parseNumber(qty), pricePerKg: parseNumber(price), note });
    if (!r.ok) return setError(r.error);
    toast("success", "Purchase request sent", `${seller?.name ?? "The seller"} can now accept, decline or counter.`);
    onClose();
    router.push(`/negotiations?deal=${r.value.id}`);
  }

  return (
    <Modal open={open} onClose={onClose} title="Send a purchase request" description={`${materialName(listing.materialId)} from ${seller?.name ?? "seller"} · ${fmtKg(listing.quantityKg)} available`}>
      <form id="request-form" onSubmit={submit} noValidate onChange={() => setError(null)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Quantity (kg)" type="number" inputMode="decimal" min={0.001} max={listing.quantityKg} step="any" value={qty} onChange={(e) => setQty(e.target.value)} hint={`Up to ${fmtKg(listing.quantityKg)}`} />
          <TextField label="Offer price (₹/kg)" type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} hint={`Listed at ${fmtInr(listing.pricePerKg)}/kg`} />
        </div>
        <TextAreaField name="note" label="Message to seller (optional)" maxLength={1000} placeholder="Pickup schedule, packaging, quality questions…" />
        <div className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3 text-[14px]">
          <span className="text-muted">Offer value</span>
          <span className="font-display text-[22px] text-forest-950">{Number.isFinite(total) ? fmtInr(total) : "—"}</span>
        </div>
        {error && <p role="alert" className="text-[13px] font-medium text-error">{error}</p>}
        <p className="text-[12px] text-muted">A request doesn&apos;t reserve stock or commit payment. Both parties agree terms in Negotiations.</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={<Send className="size-4" />}>Send request</Button>
        </div>
      </form>
    </Modal>
  );
}
