import { Check } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import type { DealStatus } from "@/services/types";
import { cx } from "@/utils/format";

export const STATUS_LABELS: Record<DealStatus, string> = {
  requested: "Requested", negotiating: "Negotiating", accepted: "Accepted", rejected: "Declined",
  in_transit: "In transit", completed: "Completed", cancelled: "Cancelled",
};

const STATUS_TONES: Record<DealStatus, "neutral" | "green" | "gold" | "red" | "blue" | "sage"> = {
  requested: "blue", negotiating: "gold", accepted: "green", rejected: "red", in_transit: "blue", completed: "sage", cancelled: "neutral",
};

export function StatusBadge({ status }: { status: DealStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

const STEPS: DealStatus[] = ["requested", "negotiating", "accepted", "in_transit", "completed"];

export function StatusTracker({ status, reached }: { status: DealStatus; reached: DealStatus[] }) {
  const ended = status === "rejected" || status === "cancelled";
  const current = STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Exchange status: ${STATUS_LABELS[status]}`}>
      {STEPS.map((s, i) => {
        const done = reached.includes(s) || (!ended && i <= current);
        return (
          <li key={s} className="flex flex-1 items-center gap-1.5">
            <span className={cx("grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold", done ? "border-forest bg-forest text-white" : "border-line-strong bg-white text-muted")} aria-current={s === status ? "step" : undefined}>
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cx("hidden text-[12px] font-medium md:inline", done ? "text-ink" : "text-muted")}>{STATUS_LABELS[s]}</span>
            {i < STEPS.length - 1 && <span className={cx("h-px flex-1", done ? "bg-forest" : "bg-line-strong")} />}
          </li>
        );
      })}
    </ol>
  );
}
