"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cx } from "@/utils/format";

/**
 * Native <dialog> modal: focus trapping, Escape and inert background come from the browser.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="modal-title"
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-panel border border-line bg-ivory p-0 text-ink shadow-lift backdrop:bg-forest-950/40 backdrop:backdrop-blur-[2px] open:animate-[modal-in_180ms_ease-out]",
        { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-6 pb-4">
            <div>
              <h2 id="modal-title" className="font-display text-[26px] leading-tight text-forest-950">{title}</h2>
              {description && <div className="mt-1 text-sm text-muted">{description}</div>}
            </div>
            <button type="button" onClick={onClose} className="focus-ring rounded-full p-1.5 text-muted hover:bg-mist" aria-label="Close dialog">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onCancel, onConfirm, title, body, confirmLabel = "Confirm", danger = false }: {
  open: boolean; onCancel: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm" footer={
      <>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </>
    }>
      <div className="text-sm leading-relaxed text-muted">{body}</div>
    </Modal>
  );
}
