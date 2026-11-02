import { ShieldAlert, ShieldCheck, ShieldHalf } from "lucide-react";
import { cx } from "@/utils/format";

/** Baseline shown for sellers without history (no reviews, no completed exchanges). */
export const NEW_SELLER_SCORE = 70;

type Level = "high" | "moderate" | "low";
export function trustLevel(score: number): Level {
  return score >= 80 ? "high" : score >= 50 ? "moderate" : "low";
}

const STYLES: Record<Level, { cls: string; icon: typeof ShieldCheck; label: string }> = {
  high: { cls: "border-sage bg-sage-50 text-forest", icon: ShieldCheck, label: "High trust" },
  moderate: { cls: "border-[#ecd9a6] bg-notice text-notice-text", icon: ShieldHalf, label: "Moderate trust" },
  low: { cls: "border-line-strong bg-mist text-muted", icon: ShieldAlert, label: "Low trust" },
};

/**
 * Compact colour-coded trust score. `score` null/undefined → "New seller" at the neutral baseline.
 * Colour is never the only signal: the icon and accessible label carry the level too.
 */
export function TrustBadge({ score, isNew = false, className, size = "sm" }: { score: number | null | undefined; isNew?: boolean; className?: string; size?: "sm" | "md" }) {
  const value = typeof score === "number" && Number.isFinite(score) ? Math.round(Math.max(0, Math.min(100, score))) : NEW_SELLER_SCORE;
  const fresh = isNew || typeof score !== "number";
  const level = trustLevel(value);
  const { cls, icon: Icon, label } = STYLES[level];
  return (
    <span
      className={cx("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-semibold tabular-nums", size === "md" ? "px-2.5 py-1 text-[12.5px]" : "px-2 py-0.5 text-[11.5px]", cls, className)}
      title={`${fresh ? "New seller" : label}: trust score ${value}%`}
      aria-label={`${fresh ? "New seller" : label}, trust score ${value} percent`}
    >
      <Icon className={size === "md" ? "size-3.5" : "size-3"} aria-hidden />
      {fresh ? `New · ${value}%` : `${value}%`}
    </span>
  );
}
