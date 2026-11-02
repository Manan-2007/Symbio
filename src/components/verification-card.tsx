"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { BadgeCheck, Clock, FileText, ShieldCheck, ShieldX, Upload } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/primitives";
import { CheckboxField, TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { GSTIN_PATTERN } from "@/services/validation";
import type { Company } from "@/services/types";
import { fmtDate } from "@/utils/format";

const MAX_DOC_BYTES = 5 * 1024 * 1024;

/** Own-company verification panel: submit GSTIN + document, then a prototype review step. */
export function VerificationCard({ company }: { company: Company }) {
  const { submitVerification, simulateVerificationReview, mode } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const v = company.verification;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const gstin = String(data.get("gstin") ?? "").trim().toUpperCase();
    if (!GSTIN_PATTERN.test(gstin)) return setError("Enter a valid 15-character GSTIN, e.g. 03ABCDE1234F1Z5.");
    if (!doc) return setError("Attach your GST certificate or company registration.");
    if (doc.size > MAX_DOC_BYTES) return setError("Document must be 5 MB or smaller.");
    if (data.get("declare") !== "on") return setError("Confirm the declaration to continue.");
    const r = await submitVerification({ gstin, documentName: doc.name });
    if (!r.ok) return setError(r.error);
    toast("success", "Submitted for verification", "Our team reviews documents within 2 working days (simulated).");
    setOpen(false);
  }

  if (company.verified) {
    return (
      <Card className="flex items-start gap-3 p-6">
        <BadgeCheck className="mt-0.5 size-6 shrink-0 text-emerald" aria-hidden />
        <div>
          <h2 className="font-display text-[22px] text-forest-950">Verified company</h2>
          <p className="text-[13px] text-muted">{v ? `GSTIN ${v.gstin} · verified ${v.reviewedAt ? fmtDate(v.reviewedAt) : ""}` : "Verified by the SYMBIO team (demo seed)."}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {v?.status === "pending" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Clock className="size-5 text-gold" aria-hidden /><h2 className="font-display text-[22px] text-forest-950">Verification under review</h2></div>
          <p className="text-[13px] text-muted">GSTIN {v.gstin} · {v.documentName} · submitted {fmtDate(v.submittedAt)}</p>
          <Notice>Prototype: no reviewer is connected. Use the buttons below to simulate the SYMBIO team&apos;s decision.</Notice>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<ShieldCheck className="size-4" />} onClick={async () => { const r = await simulateVerificationReview("verified"); toast(r.ok ? "success" : "error", r.ok ? "Company verified" : r.error); }}>Simulate approval</Button>
            <Button size="sm" variant="ghost" icon={<ShieldX className="size-4" />} onClick={async () => { const r = await simulateVerificationReview("rejected"); toast(r.ok ? "info" : "error", r.ok ? "Verification rejected (simulated)" : r.error); }}>Simulate rejection</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-forest" aria-hidden /><h2 className="font-display text-[22px] text-forest-950">Get verified</h2></div>
          <p className="text-[13px] text-muted">{v?.status === "rejected" ? "Your last request was not approved. Check your GSTIN and document, then resubmit." : "Verified companies earn a badge and a higher trust score. You'll need your GSTIN and GST certificate."}</p>
          <Button size="sm" onClick={() => setOpen(true)}>Start verification</Button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Verify your company" description="We check your GST registration against the details on your profile.">
        <form onSubmit={submit} noValidate onChange={() => setError(null)} className="space-y-4">
          <TextField name="gstin" label="GSTIN" placeholder="03ABCDE1234F1Z5" maxLength={15} autoComplete="off" className="uppercase" hint="15 characters, as printed on your GST certificate" />
          <div>
            <span className="label">GST certificate or registration document</span>
            <label className="focus-ring flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-mist p-4 text-[14px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald">
              {doc ? <FileText className="size-5 text-forest" aria-hidden /> : <Upload className="size-5 text-forest" aria-hidden />}
              <span className="truncate">{doc ? doc.name : "Choose a PDF, JPG or PNG (max 5 MB)"}</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} />
            </label>
            <p className="hint">Prototype: only the file name is recorded; the file is not uploaded.</p>
          </div>
          <CheckboxField name="declare" label="I confirm I'm authorised to represent this company and the details are accurate." />
          {error && <p role="alert" className="text-[13px] font-medium text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Submit for review</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
