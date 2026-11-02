"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { ASSISTANT_SUGGESTIONS, askAssistant } from "@/services/ai";
import { integrations } from "@/services/integrations";
import { findMaterial } from "@/services/catalog";
import { cx } from "@/utils/format";

type Turn = { id: number; role: "user" | "assistant"; text: string; materialIds?: string[] };

const CONNECTED = Boolean(integrations.ai.assistantEndpoint);

export function SymbioAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setTurns((t) => [...t, { id: nextId.current++, role: "user", text: q }]);
    setDraft("");
    setBusy(true);
    const reply = await askAssistant(q);
    setTurns((t) => [...t, { id: nextId.current++, role: "assistant", text: reply.text, materialIds: reply.materialIds }]);
    setBusy(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            aria-label="SYMBIO assistant"
            className="fixed right-4 bottom-24 z-50 flex h-[min(560px,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-panel border border-line bg-ivory shadow-lift"
          >
            <header className="flex items-center gap-3 bg-forest px-5 py-4 text-white">
              <div className="grid size-9 place-items-center rounded-full bg-white/10"><Sparkles className="size-[18px] text-sage" /></div>
              <div className="flex-1">
                <h2 className="font-display text-xl leading-none">Symbio Assistant</h2>
                <p className="mt-1 text-[11.5px] text-sage/90">{CONNECTED ? "Connected to assistant service" : "Catalogue guide · offline demo, not an AI model"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="focus-ring rounded-full p-1.5 hover:bg-white/10" aria-label="Close assistant"><X className="size-5" /></button>
            </header>
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {turns.length === 0 && (
                <div>
                  <p className="text-sm text-muted">Ask about reuse routes, buyers for a material, or how to find nearby partners.</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {ASSISTANT_SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => void ask(s)} className="focus-ring rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-ink transition-colors hover:border-forest hover:text-forest">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {turns.map((t) => (
                <div key={t.id} className={cx("flex", t.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cx("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed", t.role === "user" ? "rounded-br-md bg-forest text-white" : "rounded-bl-md border border-line bg-white text-ink")}>
                    {t.text}
                    {t.materialIds && t.materialIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {t.materialIds.map((id) => (
                          <Link key={id} href={`/marketplace?material=${id}`} onClick={() => setOpen(false)} className="rounded-full bg-sage-50 px-2.5 py-1 text-[11.5px] font-semibold text-forest hover:bg-sage">
                            Browse {findMaterial(id)?.name.toLowerCase()}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 text-[13px] text-muted"><Loader2 className="size-4 animate-spin" /> Thinking…</div>}
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-line bg-white p-3">
              <label htmlFor="assistant-input" className="sr-only">Ask the assistant</label>
              <input id="assistant-input" ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} placeholder="Ask about a material…" className="input min-h-10 flex-1 rounded-full py-2" />
              <button type="submit" disabled={!draft.trim() || busy} className="focus-ring grid size-10 shrink-0 place-items-center rounded-full bg-forest text-white disabled:opacity-40" aria-label="Send question">
                <Send className="size-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close Symbio assistant" : "Open Symbio assistant"}
        className="focus-ring fixed right-4 bottom-5 z-50 flex items-center gap-2 rounded-full bg-forest py-3 pr-5 pl-4 text-sm font-semibold text-white shadow-lift transition-transform hover:-translate-y-0.5"
      >
        {open ? <X className="size-5" /> : <Bot className="size-5" />}
        <span className="hidden sm:inline">{open ? "Close" : "Ask Symbio"}</span>
      </button>
    </>
  );
}
