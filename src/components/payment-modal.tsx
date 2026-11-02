"use client";

import { useState } from "react";
import { Building, CreditCard, Landmark, Lock, Smartphone } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { agreedTerms } from "@/services/carbonCalculator";
import type { Deal, PaymentMethod } from "@/services/types";
import { cx, fmtInr, fmtKg, fmtPricePerKg } from "@/utils/format";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = { upi: "UPI", netbanking: "Net banking", card: "Card", neft: "NEFT / RTGS" };
const ICONS: Record<PaymentMethod, typeof CreditCard> = { upi: Smartphone, netbanking: Landmark, card: CreditCard, neft: Building };

/**
 * Prototype escrow checkout. Deliberately collects no card, bank or UPI details: a production
 * build hands off to a regulated payment provider (e.g. an Indian payment gateway with escrow).
 */
export function PaymentModal({ deal, open, onClose }: { deal: Deal; open: boolean; onClose: () => void }) {
  const { payForDeal } = useApp();
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [busy, setBusy] = useState(false);
  const terms = agreedTerms(deal);
  const amount = terms.quantityKg * terms.pricePerKg;

  async function pay() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900)); // simulated provider round-trip
    const r = payForDeal(deal.id, method);
    setBusy(false);
    if (!r.ok) return toast("error", r.error);
    toast("success", "Payment held in escrow", "Simulated payment. The seller can now dispatch; funds release when you confirm receipt.");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Pay into escrow" description="Funds are held until you confirm receipt of the material.">
      <div className="space-y-5">
        <div className="rounded-2xl bg-mist p-4 text-[14px]">
          <div className="flex justify-between"><span className="text-muted">Quantity</span><span>{fmtKg(terms.quantityKg)}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-muted">Agreed price</span><span>{fmtPricePerKg(terms.pricePerKg)}</span></div>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3"><span className="font-semibold">Total</span><span className="font-display text-[28px] text-forest-950">{fmtInr(amount)}</span></div>
        </div>
        <fieldset>
          <legend className="label">Payment method</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => {
              const Icon = ICONS[m];
              return (
                <label key={m} className={cx("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-[14px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald", method === m ? "border-forest bg-sage-50" : "border-line bg-white hover:border-forest/50")}>
                  <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                  <Icon className="size-[18px] text-forest" aria-hidden />{PAYMENT_LABELS[m]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Notice>Prototype checkout: no money moves and no payment details are collected or stored. A live build redirects to a regulated payment gateway.</Notice>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={pay} disabled={busy} icon={<Lock className="size-4" />}>{busy ? "Processing…" : `Pay ${fmtInr(amount)} (simulated)`}</Button>
        </div>
      </div>
    </Modal>
  );
}
