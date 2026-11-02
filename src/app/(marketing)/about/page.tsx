import type { Metadata } from "next";
import { ArrowRight, Factory, Leaf, Scale, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "About" };

const PRINCIPLES = [
  { icon: Scale, title: "Transparent matching", body: "Every score shows its working: material, quantity, distance and price, with the weights in plain sight." },
  { icon: ShieldCheck, title: "Honest data", body: "Quality, moisture and contamination are declared up front. Estimates are labelled as estimates." },
  { icon: Factory, title: "Built for industry", body: "Bulk quantities, grades and logistics preferences, not consumer-style listings." },
  { icon: Leaf, title: "Measured impact", body: "Only completed exchanges count, using material-specific factors you can inspect." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-12 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="eyebrow">About SYMBIO</p>
          <h1 className="mt-3 font-display text-[48px] leading-[1.02] font-medium text-forest-950 sm:text-[64px]">Industrial symbiosis, <em className="italic text-emerald">for every factory floor.</em></h1>
        </div>
        <p className="text-[16px] leading-relaxed text-muted">
          A furniture workshop&apos;s sawdust can feed a mushroom farm. A garment maker&apos;s offcuts can insulate a home. SYMBIO finds these connections, scores how well they fit, and helps both sides complete the exchange, building a circular industrial economy one match at a time.
        </p>
      </div>
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="rounded-card border border-line bg-white p-7 shadow-soft">
            <p.icon className="size-6 text-forest" aria-hidden />
            <h2 className="mt-5 font-display text-[24px] text-forest-950">{p.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-16 rounded-panel bg-forest p-10 text-white sm:p-14">
        <h2 className="max-w-2xl font-display text-[38px] leading-tight">This is a demonstration build.</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-sage/90">
          Companies, listings, reviews and testimonials are fictional. Accounts are simulated and data is stored only in your browser. Carbon figures use illustrative factors and are not certified offsets. Shared accounts, a database and live maps are ready to connect when credentials are provided.
        </p>
        <ButtonLink href="/marketplace" variant="light" className="mt-8" iconRight={<ArrowRight className="size-4" />}>Explore the marketplace</ButtonLink>
      </div>
    </div>
  );
}
