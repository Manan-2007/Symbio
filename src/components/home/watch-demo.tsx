"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ClipboardList, Handshake, Leaf, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";

const STEPS = [
  { icon: ClipboardList, title: "List a by-product", body: "Green Furniture lists 500 kg of untreated sawdust at ₹4/kg in Ludhiana, with quality, moisture and contamination details." },
  { icon: Sparkles, title: "Get matched automatically", body: "FreshGrow Mushroom Farm needs 400 kg within its budget of ₹5/kg. The engine scores material, quantity, distance and price: 97.5%." },
  { icon: Handshake, title: "Negotiate and agree", body: "FreshGrow sends a purchase request. The seller counters, the buyer accepts, and both track dispatch and receipt." },
  { icon: Leaf, title: "Measure the impact", body: "Once the exchange is confirmed, reused kilograms and an illustrative CO₂e estimate appear on the impact dashboard." },
];

/** Guided walkthrough of the core flow, with a one-click jump into the live demo as the buyer. */
export function WatchDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const { loginAsCompany } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const S = STEPS[step];
  const Icon = S.icon;

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); setStep(0); }}
      title="How SYMBIO works"
      description={`Step ${step + 1} of ${STEPS.length} · fictional demo companies`}
      footer={
        <>
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} icon={<ChevronLeft className="size-4" />}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} iconRight={<ChevronRight className="size-4" />}>Next</Button>
          ) : (
            <Button onClick={async () => {
              const r = await loginAsCompany("co-freshgrow");
              if (r.ok) { toast("success", "Exploring as FreshGrow Mushroom Farm", "Demo account, no password needed."); onClose(); setStep(0); router.push("/matches"); }
              else toast("error", r.error);
            }}>Try it live as FreshGrow</Button>
          )}
        </>
      }
    >
      <div className="flex gap-1.5" aria-hidden>
        {STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-forest" : "bg-line"}`} />)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="mt-6 flex gap-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sage-50 text-forest"><Icon className="size-6" /></div>
          <div>
            <h3 className="font-display text-2xl text-forest-950">{S.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{S.body}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
