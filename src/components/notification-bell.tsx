"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Handshake, IndianRupee, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useClientNow } from "@/hooks/use-client-now";
import { notificationsFor } from "@/services/notifications";
import type { NotificationKind } from "@/services/notifications";
import { cx, fmtDateTime } from "@/utils/format";

const ICONS: Record<NotificationKind, typeof Bell> = { deal: Handshake, payment: IndianRupee, message: MessageSquare, verification: ShieldCheck, match: Sparkles };

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { state, me, markNotificationsSeen } = useApp();
  const clientNow = useClientNow();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = useMemo(() => (me && clientNow ? notificationsFor(state, me.id, clientNow) : []), [state, me, clientNow]);
  const unread = items.filter((n) => n.unread).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!me) return null;
  return (
    <div ref={ref} className="relative z-40">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="focus-ring relative grid size-10 place-items-center rounded-full border border-line bg-white text-ink hover:border-forest">
        <Bell className="size-[18px]" />
        {unread > 0 && <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-error px-1 text-[10.5px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            role="dialog" aria-label="Notifications"
            className={cx("absolute top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-lift", align === "right" ? "right-0" : "left-0")}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display text-[20px] text-forest-950">Notifications</p>
              <button type="button" onClick={markNotificationsSeen} disabled={!unread} className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold text-emerald disabled:text-muted">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
                {items.map((n) => {
                  const Icon = ICONS[n.kind];
                  return (
                    <li key={n.id}>
                      <Link href={n.href} onClick={() => setOpen(false)} className={cx("flex gap-3 px-4 py-3 transition-colors hover:bg-mist", n.unread && "bg-sage-50/60")}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sage-50 text-forest"><Icon className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">{n.title}{n.unread && <span className="size-1.5 rounded-full bg-emerald" aria-label="unread" />}</span>
                          <span className="block text-[12.5px] text-muted">{n.body}</span>
                          <span className="block text-[11px] text-muted/80">{fmtDateTime(n.at)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="border-t border-line px-4 py-2 text-[11px] text-muted">Prototype: in-app only. Email/SMS delivery comes with the backend.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
