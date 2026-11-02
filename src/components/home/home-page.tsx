"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Factory, Handshake, Leaf, MapPin, PlayCircle, Quote, Recycle, ScanSearch, Sparkles, Sprout } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ButtonLink, Button } from "@/components/ui/button";
import { DemoTag } from "@/components/ui/primitives";
import { CountUp, FactorBar, MaterialArt, ScoreRing, CATEGORY_ICONS } from "@/components/ui/visuals";
import { ListingCard } from "@/components/listing-card";
import { HeroGlobe } from "./hero-globe";
import { WatchDemo } from "./watch-demo";
import { CATEGORIES } from "@/services/types";
import { CATEGORY_BLURBS, CATEGORY_LABELS, cityName, findMaterial } from "@/services/catalog";
import { evaluate, isMatch, WEIGHTS } from "@/services/matchingEngine";
import { impactRecords, impactTotals } from "@/services/carbonCalculator";
import { fmtNumber } from "@/utils/format";

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

function Section({ id, eyebrow, title, intro, children, className }: { id?: string; eyebrow: string; title: ReactNode; intro?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-[1240px] scroll-mt-24 px-5 sm:px-8 ${className ?? "mt-28"}`}>
      <motion.div {...fade} className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 font-display text-[38px] leading-[1.05] font-medium text-forest-950 sm:text-[48px]">{title}</h2>
        {intro && <p className="mt-4 text-[16px] leading-relaxed text-muted">{intro}</p>}
      </motion.div>
      <div className="mt-12">{children}</div>
    </section>
  );
}

export function HomePage() {
  const { state } = useApp();
  const [demoOpen, setDemoOpen] = useState(false);

  const totals = useMemo(() => impactTotals(impactRecords(state)), [state]);
  const sample = useMemo(() => {
    const listing = state.listings.find((l) => l.id === "ls-sawdust-green");
    const requirement = state.requirements.find((r) => r.id === "rq-freshgrow-sawdust");
    if (!listing || !requirement) return null;
    const m = evaluate(listing, requirement);
    return isMatch(m) ? m : null;
  }, [state]);
  const featured = state.listings.filter((l) => l.status === "active").slice(0, 3);

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="px-3 pt-2 sm:px-5">
        <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-panel bg-[#eef0e6]">
          {/* misty sky and rolling hills */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_70%_at_70%_0%,#fbfaf4_0%,#eef0e4_45%,#dfe6d3_100%)]" />
          <svg viewBox="0 0 1400 800" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 -z-10 size-full" aria-hidden>
            <defs>
              <linearGradient id="hill1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#a9c49a" /><stop offset="1" stopColor="#6f9a6d" /></linearGradient>
              <linearGradient id="hill2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6f9a6d" /><stop offset="1" stopColor="#2f5c3f" /></linearGradient>
              <linearGradient id="hill3" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3a6a4a" /><stop offset="1" stopColor="#0f261b" /></linearGradient>
              <linearGradient id="mist" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f6f4ec" stopOpacity="0" /><stop offset="1" stopColor="#f6f4ec" stopOpacity="0.55" /></linearGradient>
            </defs>
            <path d="M0 520 C 180 460, 340 470, 520 500 C 700 530, 860 450, 1040 470 C 1220 490, 1320 450, 1400 440 V800 H0 Z" fill="url(#hill1)" opacity="0.7" />
            <rect y="440" width="1400" height="120" fill="url(#mist)" />
            <path d="M0 600 C 220 540, 420 560, 620 600 C 820 640, 1000 560, 1200 570 C 1300 575, 1360 590, 1400 600 V800 H0 Z" fill="url(#hill2)" />
            <path d="M0 690 C 260 630, 520 650, 760 700 C 980 745, 1200 680, 1400 660 V800 H0 Z" fill="url(#hill3)" />
          </svg>

          <div className="grid items-center gap-6 px-6 pt-14 pb-10 sm:px-12 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20 lg:pb-14">
            <div className="relative z-10 order-2 lg:order-1">
              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white/70 px-3.5 py-1.5 text-[12.5px] font-semibold text-forest backdrop-blur-sm">
                <Recycle className="size-3.5" aria-hidden /> Industrial symbiosis, made simple
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }} className="mt-6 font-display text-[46px] leading-[0.98] font-medium tracking-[-0.01em] text-forest-950 sm:text-[64px] lg:text-[76px]">
                One Industry&apos;s Waste. <em className="font-normal text-emerald italic">Another Industry&apos;s Wealth.</em>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink/75">
                Turn industrial byproducts into valuable resources. Symbio connects businesses to build a circular economy and create a greener tomorrow.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/matches" size="lg" iconRight={<ArrowRight className="size-4" />}>Start Matching</ButtonLink>
                <Button size="lg" variant="secondary" className="bg-white/80 backdrop-blur-sm" icon={<PlayCircle className="size-[18px]" />} onClick={() => setDemoOpen(true)}>Watch Demo</Button>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="order-1 mx-auto w-full max-w-[460px] lg:order-2 lg:max-w-[540px]">
              <HeroGlobe className="h-auto w-full drop-shadow-[0_30px_40px_rgba(15,38,27,0.18)]" />
            </motion.div>
          </div>

          {/* stats strip on the dark hill */}
          <div className="relative z-10 mx-4 mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10 text-white backdrop-blur-md sm:mx-8 sm:mb-8 lg:grid-cols-4">
            {[
              { label: "Material reused", value: totals.reusedKg, format: (n: number) => `${fmtNumber(n / 1000, 1)} t` },
              { label: "Illustrative CO₂e avoided", value: totals.co2eKg, format: (n: number) => `${fmtNumber(n / 1000, 1)} t` },
              { label: "Companies connected", value: state.companies.length, format: undefined },
              { label: "Active listings", value: state.listings.filter((l) => l.status === "active").length, format: undefined },
            ].map((s) => (
              <div key={s.label} className="bg-forest-950/35 px-5 py-5 sm:px-7">
                <p className="font-display text-[34px] leading-none sm:text-[40px]"><CountUp value={s.value} format={s.format} /></p>
                <p className="mt-2 text-[12.5px] text-sage/90">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="relative z-10 -mt-2 mb-4 px-8 text-right text-[11px] text-sage/80 sm:mb-6">Demo data · illustrative estimates</p>
        </div>
      </section>
      <WatchDemo open={demoOpen} onClose={() => setDemoOpen(false)} />

      {/* ---------------- How it works ---------------- */}
      <Section id="how-it-works" eyebrow="How it works" title={<>From surplus to supply in <em className="italic text-emerald">four calm steps</em></>} intro="No brokers, no guesswork. Publish what you have or what you need, and let the matching engine do the searching.">
        <ol className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Factory, title: "List or request", body: "Generators list by-products with quality data. Consumers publish material requirements." },
            { icon: Sparkles, title: "Smart matching", body: "Material, quantity, distance and price are weighted into a transparent match score." },
            { icon: Handshake, title: "Negotiate", body: "Send purchase requests, counter on price or quantity, and agree terms in one thread." },
            { icon: Leaf, title: "Exchange & measure", body: "Track dispatch and receipt, then see reused tonnage and estimated CO₂e avoided." },
          ].map((step, i) => (
            <motion.li key={step.title} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="bg-white p-7">
              <div className="flex items-center justify-between">
                <span className="font-display text-[44px] leading-none text-sage">0{i + 1}</span>
                <step.icon className="size-6 text-forest" aria-hidden />
              </div>
              <h3 className="mt-6 font-display text-[26px] text-forest-950">{step.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </Section>

      {/* ---------------- Generators / Consumers ---------------- */}
      <section className="mx-auto mt-28 grid max-w-[1240px] gap-6 px-5 sm:px-8 lg:grid-cols-[1.15fr_1fr]">
        <motion.div {...fade} className="relative overflow-hidden rounded-panel bg-forest p-9 text-white sm:p-12">
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-emerald/40 blur-3xl" aria-hidden />
          <p className="eyebrow text-sage">For waste generators</p>
          <h2 className="mt-3 font-display text-[40px] leading-[1.05]">Turn disposal costs into a revenue line.</h2>
          <ul className="mt-6 space-y-3 text-[15px] text-sage/95">
            {["List by-products in minutes with grade, moisture and contamination", "Reach verified buyers ranked by fit, not by who calls first", "Track every exchange and the landfill it avoided"].map((t) => (
              <li key={t} className="flex gap-3"><Sprout className="mt-0.5 size-[18px] shrink-0 text-leaf" aria-hidden />{t}</li>
            ))}
          </ul>
          <ButtonLink href="/listings/new" variant="light" className="mt-8" iconRight={<ArrowUpRight className="size-4" />}>List your waste</ButtonLink>
        </motion.div>
        <motion.div {...fade} transition={{ ...fade.transition, delay: 0.1 }} className="relative overflow-hidden rounded-panel border border-line bg-white p-9 sm:p-12">
          <p className="eyebrow">For material consumers</p>
          <h2 className="mt-3 font-display text-[40px] leading-[1.05] text-forest-950">Source secondary raw materials nearby.</h2>
          <ul className="mt-6 space-y-3 text-[15px] text-muted">
            {["Publish specifications once and get matched continuously", "Filter by quality, budget, radius and delivery preference", "Negotiate transparently with suppliers in one place"].map((t) => (
              <li key={t} className="flex gap-3"><MapPin className="mt-0.5 size-[18px] shrink-0 text-emerald" aria-hidden />{t}</li>
            ))}
          </ul>
          <ButtonLink href="/requirements" variant="secondary" className="mt-8" iconRight={<ArrowUpRight className="size-4" />}>Publish a requirement</ButtonLink>
        </motion.div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <Section id="categories" eyebrow="Featured categories" title="Seven streams. Endless second lives." intro="Every category carries its own reuse routes, quality checks and buyer industries.">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.map((category, i) => {
            const Icon = CATEGORY_ICONS[category];
            const count = state.listings.filter((l) => l.status === "active" && findMaterial(l.materialId)?.category === category).length;
            return (
              <motion.div key={category} {...fade} transition={{ ...fade.transition, delay: (i % 4) * 0.06 }} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                <Link href={`/marketplace?category=${category}`} className="group focus-ring relative flex h-full min-h-[180px] flex-col justify-end overflow-hidden rounded-card border border-line bg-white shadow-soft transition-shadow hover:shadow-lift">
                  <div className="absolute inset-0"><MaterialArt category={category} className="size-full transition-transform duration-700 group-hover:scale-105" /></div>
                  <div className="relative m-3 rounded-2xl bg-white/90 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-[22px] leading-tight text-forest-950">{CATEGORY_LABELS[category]}</h3>
                      <Icon className="size-[18px] shrink-0 text-forest" aria-hidden />
                    </div>
                    {i === 0 && <p className="mt-1 text-[13px] text-muted">{CATEGORY_BLURBS[category]}</p>}
                    <p className="mt-1 text-[12px] font-semibold text-emerald">{count} active listing{count === 1 ? "" : "s"}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          <motion.div {...fade} className="col-span-2 flex flex-col justify-between rounded-card border border-dashed border-line-strong p-5">
            <ScanSearch className="size-6 text-forest" aria-hidden />
            <div>
              <p className="font-display text-[22px] leading-tight text-forest-950">Not sure what you have?</p>
              <Link href="/classifier" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-emerald hover:underline">Try the waste classifier <ArrowRight className="size-3.5" /></Link>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ---------------- Matching engine showcase ---------------- */}
      {sample && (
        <Section eyebrow="The matching engine" title={<>Transparent scores, <em className="italic text-emerald">explained</em></>} intro="Incompatible materials, poor quality or excess contamination are rejected outright. Everything else is ranked with a weighted, explainable score.">
          <motion.div {...fade} className="grid overflow-hidden rounded-panel border border-line bg-white shadow-soft lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col gap-6 bg-mist p-8 sm:p-10">
              <div className="flex items-center justify-between"><p className="eyebrow">Sample match</p><DemoTag label="Illustrative" /></div>
              <div className="flex items-center gap-5">
                <ScoreRing score={sample.score} size={104} />
                <div>
                  <p className="font-display text-[30px] leading-tight text-forest-950">{sample.score}% match</p>
                  <p className="text-[14px] text-muted">Score = M×0.40 + Q×0.25 + D×0.25 + P×0.10</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-white p-4">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Supplier</p>
                  <p className="mt-1 font-semibold">Green Furniture Ltd.</p>
                  <p className="text-[13px] text-muted">Sawdust · 500 kg · ₹4/kg · {cityName(sample.listing.cityId, sample.listing.location)}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white p-4">
                  <p className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Buyer</p>
                  <p className="mt-1 font-semibold">FreshGrow Mushroom Farm</p>
                  <p className="text-[13px] text-muted">Needs 400 kg · budget ₹5/kg · {cityName(sample.requirement.cityId, sample.requirement.location)}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-5 p-8 sm:p-10">
              <FactorBar label="Material compatibility" value={sample.breakdown.material} weight={WEIGHTS.material} detail="Exact material: sawdust → sawdust" />
              <FactorBar label="Quantity" value={sample.breakdown.quantity} weight={WEIGHTS.quantity} detail="500 kg available covers the full 400 kg" />
              <FactorBar label="Proximity" value={sample.breakdown.distance} weight={WEIGHTS.distance} detail={`About ${sample.distanceKm.toFixed(1)} km straight-line within a ${sample.requirement.maxDistanceKm} km radius`} />
              <FactorBar label="Price" value={sample.breakdown.price} weight={WEIGHTS.price} detail="₹4/kg is within the ₹5/kg budget" />
              <ButtonLink href={`/matches/${sample.id}`} variant="secondary" className="mt-2 self-start" iconRight={<ArrowRight className="size-4" />}>Open full match details</ButtonLink>
            </div>
          </motion.div>
        </Section>
      )}

      {/* ---------------- Featured listings ---------------- */}
      <Section eyebrow="Marketplace" title="Fresh on the marketplace" intro="A selection of current fictional demo listings.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
        <div className="mt-8 flex justify-center"><ButtonLink href="/marketplace" variant="secondary" iconRight={<ArrowRight className="size-4" />}>Browse the marketplace</ButtonLink></div>
      </Section>

      {/* ---------------- Impact ---------------- */}
      <section className="mx-auto mt-28 max-w-[1240px] px-5 sm:px-8">
        <motion.div {...fade} className="relative overflow-hidden rounded-panel bg-forest-950 px-8 py-14 text-white sm:px-14">
          <div className="absolute -bottom-40 -left-20 size-[420px] rounded-full bg-emerald/30 blur-3xl" aria-hidden />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
            <div>
              <p className="eyebrow text-sage">Environmental impact</p>
              <h2 className="mt-3 font-display text-[42px] leading-[1.05]">Every completed exchange keeps material out of landfill.</h2>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-sage/85">Estimated avoided CO₂e = reused quantity × material-specific factor. Factors here are illustrative demo values, never certified offsets.</p>
              <ButtonLink href="/impact" variant="light" className="mt-7" iconRight={<ArrowRight className="size-4" />}>Explore the impact dashboard</ButtonLink>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "kg diverted from landfill", value: totals.reusedKg },
                { label: "kg CO₂e avoided (illustrative)", value: totals.co2eKg },
                { label: "completed exchanges", value: totals.exchanges },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="font-display text-[32px] leading-none sm:text-[40px]"><CountUp value={s.value} /></p>
                  <p className="mt-2 text-[12px] text-sage/85">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <Section eyebrow="Voices" title="What partners say" intro={<>Sample testimonials from fictional companies. <DemoTag label="Demo content" className="ml-1 align-middle" /></>}>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { quote: "We used to pay to haul sawdust away. Now it grows mushrooms twenty kilometres down the road.", name: "Operations lead", company: "Green Furniture Ltd." },
            { quote: "The match explanations told us exactly why a supplier fit. Our procurement cycle went from weeks to days.", name: "Head of sourcing", company: "FreshGrow Mushroom Farm" },
            { quote: "Contamination and moisture data up front means fewer rejected loads. That alone pays for the effort.", name: "Plant manager", company: "Threadloop Insulation" },
          ].map((t, i) => (
            <motion.figure key={t.company} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="flex flex-col rounded-card border border-line bg-white p-7 shadow-soft">
              <Quote className="size-7 text-sage" aria-hidden />
              <blockquote className="mt-4 flex-1 font-display text-[22px] leading-snug text-forest-950">“{t.quote}”</blockquote>
              <figcaption className="mt-6 border-t border-line pt-4 text-[13px]"><span className="font-semibold">{t.name}</span><span className="text-muted"> · {t.company} (fictional)</span></figcaption>
            </motion.figure>
          ))}
        </div>
      </Section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto mt-28 max-w-[1240px] px-5 sm:px-8">
        <motion.div {...fade} className="relative overflow-hidden rounded-panel border border-line bg-[linear-gradient(120deg,#e9f2ea_0%,#f6f4ec_55%,#f6efe1_100%)] px-8 py-14 text-center sm:px-14">
          <h2 className="mx-auto max-w-2xl font-display text-[42px] leading-[1.05] text-forest-950 sm:text-[54px]">Your by-product is someone&apos;s raw material.</h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] text-muted">Create a company account in a minute, or explore instantly with a demo company.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/register" size="lg">Get Started</ButtonLink>
            <ButtonLink href="/marketplace" size="lg" variant="secondary">Browse marketplace</ButtonLink>
          </div>
        </motion.div>
      </section>
    </>
  );
}
