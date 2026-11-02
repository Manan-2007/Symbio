import type { ComponentProps, ReactNode } from "react";
import { Info } from "lucide-react";
import { cx } from "@/utils/format";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-card border border-line bg-white shadow-soft", className)} {...props} />;
}

type Tone = "neutral" | "green" | "gold" | "red" | "blue" | "sage";
const tones: Record<Tone, string> = {
  neutral: "bg-mist text-muted border-line",
  green: "bg-sage-50 text-forest border-sage",
  sage: "bg-sage text-forest-900 border-sage",
  gold: "bg-gold-50 text-[#7a5a26] border-[#e7d6b6]",
  red: "bg-error-50 text-error border-[#f0cfcb]",
  blue: "bg-[#eef3f7] text-[#30506b] border-[#d5e1ea]",
};

export function Badge({ tone = "neutral", className, children, icon }: { tone?: Tone; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-semibold", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

/** Small persistent marker for fictional content. */
export function DemoTag({ className, label = "Demo data" }: { className?: string; label?: string }) {
  return <Badge tone="gold" className={className}>{label}</Badge>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[34px] font-medium leading-[1.05] text-forest-950 sm:text-[42px]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-sage-50 text-forest">{icon}</div>}
      <h3 className="font-display text-2xl text-forest-950">{title}</h3>
      {children && <p className="mt-2 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "gold", children, className }: { tone?: "gold" | "red" | "green"; children: ReactNode; className?: string }) {
  const styles = { gold: "bg-notice text-notice-text", red: "bg-error-50 text-error", green: "bg-sage-50 text-forest" }[tone];
  return (
    <div role={tone === "red" ? "alert" : "note"} className={cx("flex gap-2.5 rounded-xl px-4 py-3 text-[13px] leading-relaxed", styles, className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-cream", className)} aria-hidden />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="grid gap-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-10 w-1/3" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
