"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; title: string; body?: string };
type ToastApi = { toast: (tone: ToastTone, title: string, body?: string) => void };

const ToastContext = createContext<ToastApi | null>(null);
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info } as const;
const TONES = { success: "text-emerald", error: "text-error", info: "text-gold" } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastApi["toast"]>((tone, title, body) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-3), { id, tone, title, body }]);
    window.setTimeout(() => dismiss(id), tone === "error" ? 6500 : 4500);
  }, [dismiss]);

  const api = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-[380px]">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.22 }}
                role={t.tone === "error" ? "alert" : "status"}
                className="pointer-events-auto flex w-full gap-3 rounded-2xl border border-line bg-white p-4 shadow-lift"
              >
                <Icon className={`mt-0.5 size-5 shrink-0 ${TONES[t.tone]}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-[13px] text-muted">{t.body}</p>}
                </div>
                <button type="button" onClick={() => dismiss(t.id)} className="focus-ring -m-1 h-fit rounded-full p-1 text-muted hover:bg-mist" aria-label="Dismiss notification">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
