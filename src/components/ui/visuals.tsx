"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { Boxes, Cog, HardHat, Leaf, Newspaper, Shirt, Trees } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Category } from "@/services/types";
import { cx } from "@/utils/format";

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
        <circle cx="20" cy="20" r="20" fill={light ? "#ffffff" : "#1e4d36"} />
        <path d="M20 9c5.5 0 10 4.3 10.4 9.7h-3.6A6.9 6.9 0 0 0 20 12.6V9Z" fill={light ? "#1e4d36" : "#c3dfc9"} />
        <path d="M31 21.3c-.6 5.4-5.2 9.7-10.7 9.7-1.9 0-3.7-.5-5.2-1.4l1.8-3.1a6.9 6.9 0 0 0 10.5-5.2H31Z" fill={light ? "#57a773" : "#57a773"} />
        <path d="M13 27.8A10.4 10.4 0 0 1 17.6 9.3l.9 3.5a6.9 6.9 0 0 0-2.9 12.3L13 27.8Z" fill={light ? "#1e4d36" : "#ffffff"} />
      </svg>
      <span className={cx("font-display text-[22px] font-semibold tracking-[0.08em]", light ? "text-white" : "text-forest-950")}>SYMBIO</span>
    </span>
  );
}

export const CATEGORY_ICONS: Readonly<Record<Category, LucideIcon>> = {
  wood: Trees,
  textile: Shirt,
  plastic: Boxes,
  metal: Cog,
  organic: Leaf,
  paper: Newspaper,
  construction: HardHat,
};

const CATEGORY_GRADIENTS: Readonly<Record<Category, [string, string, string]>> = {
  wood: ["#efe2cc", "#c9a679", "#8a6438"],
  textile: ["#ece6f0", "#c8b8d6", "#7d6694"],
  plastic: ["#e3eef2", "#a9cbd8", "#4f7f92"],
  metal: ["#e9eaea", "#b9bec0", "#6b7376"],
  organic: ["#e6efdc", "#a8c98a", "#557a39"],
  paper: ["#f1eadf", "#d4c2a3", "#8f7a55"],
  construction: ["#ece8e2", "#c4b9aa", "#7c7062"],
};

/**
 * Soft, render-like tile for a material category: layered gradient "pile" with a light
 * source, used where no uploaded photo exists.
 */
export function MaterialArt({ category, className, imageUrl, alt = "" }: { category: Category; className?: string; imageUrl?: string | null; alt?: string }) {
  const [light, mid, dark] = CATEGORY_GRADIENTS[category];
  const Icon = CATEGORY_ICONS[category];
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL, not an optimisable asset
    return <img src={imageUrl} alt={alt} className={cx("size-full object-cover", className)} />;
  }
  const id = `ma-${category}`;
  return (
    <div className={cx("relative isolate overflow-hidden", className)} style={{ background: `radial-gradient(120% 90% at 20% 10%, #fff 0%, ${light} 55%, ${mid} 130%)` }} aria-hidden>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
        <defs>
          <radialGradient id={`${id}-pile`} cx="35%" cy="25%" r="80%">
            <stop offset="0" stopColor={light} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </radialGradient>
          <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <ellipse cx="100" cy="112" rx="78" ry="9" fill={dark} opacity="0.22" filter={`url(#${id}-blur)`} />
        <path d="M22 110 C 40 70, 70 52, 100 50 C 132 52, 160 72, 178 110 Z" fill={`url(#${id}-pile)`} />
        <path d="M58 110 C 70 84, 88 74, 104 73 C 122 74, 138 86, 150 110 Z" fill={light} opacity="0.35" />
        {[...Array(9)].map((_, i) => (
          <circle key={i} cx={40 + ((i * 37) % 120)} cy={80 + ((i * 13) % 26)} r={1.6 + (i % 3)} fill={i % 2 ? dark : "#fff"} opacity={i % 2 ? 0.35 : 0.5} />
        ))}
      </svg>
      <div className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/80 text-forest shadow-soft backdrop-blur-sm">
        <Icon className="size-[18px]" />
      </div>
    </div>
  );
}

/** Circular match-percentage gauge. */
export function ScoreRing({ score, size = 76, label = "Match" }: { score: number; size?: number; label?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "#2f7a52" : score >= 70 ? "#57a773" : "#a8834a";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label} score ${score} percent`}>
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e9f2ea" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="text-center leading-none">
        <span className="font-display text-[22px] font-semibold text-forest-950">{score % 1 === 0 ? score : score.toFixed(1)}</span>
        <span className="text-[11px] font-semibold text-muted">%</span>
      </div>
    </div>
  );
}

/** Horizontal factor bar used in compatibility breakdowns. */
export function FactorBar({ label, value, weight, detail }: { label: string; value: number; weight: number; detail?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-semibold text-ink">{label} <span className="font-normal text-muted">· weight {Math.round(weight * 100)}%</span></span>
        <span className="tabular-nums font-semibold text-forest">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sage-50">
        <div className="h-full rounded-full bg-gradient-to-r from-leaf to-emerald transition-[width] duration-700" style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
      {detail && <p className="mt-1 text-[12px] text-muted">{detail}</p>}
    </div>
  );
}

/** Number that counts up once scrolled into view (instant when reduced motion is preferred). */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-IN") }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const controls = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [inView, reduce, value]);
  return <span ref={ref} className="tabular-nums">{format(shown)}</span>;
}

export function StatCard({ label, value, format, icon, hint, accent = false }: {
  label: string; value: number; format?: (n: number) => string; icon: ReactNode; hint?: ReactNode; accent?: boolean;
}) {
  return (
    <div className={cx("relative overflow-hidden rounded-card border p-5 shadow-soft", accent ? "border-forest bg-forest text-white" : "border-line bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <p className={cx("text-[13px] font-semibold", accent ? "text-sage" : "text-muted")}>{label}</p>
        <div className={cx("grid size-9 place-items-center rounded-full", accent ? "bg-white/10 text-sage" : "bg-sage-50 text-forest")}>{icon}</div>
      </div>
      <p className={cx("mt-3 font-display text-[36px] leading-none font-medium", accent ? "text-white" : "text-forest-950")}>
        <CountUp value={value} format={format} />
      </p>
      {hint && <p className={cx("mt-2 text-[12px]", accent ? "text-sage/90" : "text-muted")}>{hint}</p>}
    </div>
  );
}
