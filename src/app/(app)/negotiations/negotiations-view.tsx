"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Check, Handshake, MessageSquare, Repeat2, Send, Truck, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/primitives";
import { TextField } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { StatusBadge, StatusTracker, STATUS_LABELS } from "@/components/deal-status";
import { materialName } from "@/services/catalog";
import { agreedTerms } from "@/services/carbonCalculator";
import { parseNumber } from "@/services/validation";
import type { Deal, Result } from "@/services/types";
import { cx, fmtDateTime, fmtInr, fmtKg, fmtPricePerKg, shortId } from "@/utils/format";

type Pending = { kind: "reject" | "cancel" | "receive" | "accept"; title: string; body: string; label: string; danger?: boolean };

function Thread({ deal, onBack }: { deal: Deal; onBack: () => void }) {
  const app = useApp();
  const { state, me } = app;
  const { toast } = useToast();
  const [counterOpen, setCounterOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const company = me!;
  const listing = state.listings.find((l) => l.id === deal.listingId)!;
  const isBuyer = deal.buyerId === company.id;
  const other = state.companies.find((c) => c.id === (isBuyer ? deal.sellerId : deal.buyerId));
  const last = deal.offers[deal.offers.length - 1];
  const myTurn = last.byCompanyId !== company.id;
  const terms = agreedTerms(deal);
  const open = deal.status === "requested" || deal.status === "negotiating";

  const timeline = useMemo(() => [
    ...deal.offers.map((o, i) => ({ kind: "offer" as const, at: o.createdAt, id: o.id, by: o.byCompanyId, offer: o, first: i === 0 })),
    ...deal.messages.map((m) => ({ kind: "message" as const, at: m.createdAt, id: m.id, by: m.companyId, text: m.text })),
    ...deal.history.filter((h) => h.status !== "requested" && h.status !== "negotiating").map((h, i) => ({ kind: "status" as const, at: h.at, id: `${deal.id}-h${i}`, by: h.byCompanyId, status: h.status })),
  ].sort((a, b) => a.at.localeCompare(b.at)), [deal]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [timeline.length]);

  const done = (r: Result<unknown>, success: string, body?: string) => {
    if (r.ok) toast("success", success, body);
    else toast("error", r.error);
    return r.ok;
  };

  function confirmPending() {
    if (!pending) return;
    const map = {
      accept: () => done(app.acceptDeal(deal.id), "Terms accepted", "The seller can now dispatch the material."),
      reject: () => done(app.rejectDeal(deal.id), "Request declined"),
      cancel: () => done(app.cancelDeal(deal.id), "Exchange cancelled"),
      receive: () => done(app.markReceived(deal.id), "Receipt confirmed", "This exchange now counts toward your impact."),
    };
    map[pending.kind]();
    setPending(null);
  }

  function counter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const r = app.counterOffer(deal.id, { quantityKg: parseNumber(d.get("qty")), pricePerKg: parseNumber(d.get("price")), note: d.get("note") });
    if (!r.ok) return setError(r.error);
    toast("success", "Counter-offer sent");
    setCounterOpen(false);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const r = app.sendMessage(deal.id, message);
    if (r.ok) setMessage("");
    else toast("error", r.error);
  }

  const name = (id: string) => (id === company.id ? "You" : state.companies.find((c) => c.id === id)?.name ?? "Company");

  return (
    <Card className="flex min-h-[640px] flex-col overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <button type="button" onClick={onBack} className="focus-ring mb-3 inline-flex items-center gap-1 rounded text-[13px] font-semibold text-muted hover:text-forest lg:hidden"><ArrowLeft className="size-4" /> All exchanges</button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] text-muted">TXN-{shortId(deal.id)} · {isBuyer ? "You are buying" : "You are selling"}</p>
            <h2 className="font-display text-[28px] leading-tight text-forest-950">{materialName(listing.materialId)} with <Link href={`/companies/${other?.id}`} className="hover:underline">{other?.name}</Link></h2>
            <p className="text-[13px] text-muted">Current terms: {fmtKg(terms.quantityKg)} at {fmtPricePerKg(terms.pricePerKg)} = <strong className="text-ink">{fmtInr(terms.quantityKg * terms.pricePerKg)}</strong></p>
          </div>
          <StatusBadge status={deal.status} />
        </div>
        <div className="mt-5"><StatusTracker status={deal.status} reached={deal.history.map((h) => h.status)} /></div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-mist/60 p-5 sm:p-6" aria-live="polite">
        {timeline.map((item) => {
          const mine = item.by === company.id;
          if (item.kind === "status") {
            return <p key={item.id} className="text-center text-[12px] text-muted">{name(item.by)} marked the exchange <strong>{STATUS_LABELS[item.status].toLowerCase()}</strong> · {fmtDateTime(item.at)}</p>;
          }
          if (item.kind === "offer") {
            return (
              <div key={item.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cx("w-full max-w-[340px] rounded-2xl border p-4", mine ? "border-forest/20 bg-sage-50" : "border-line bg-white")}>
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted"><Repeat2 className="size-3.5" />{item.first ? "Purchase request" : "Counter-offer"} · {name(item.by)}</p>
                  <p className="mt-1 font-display text-[22px] text-forest-950">{fmtKg(item.offer.quantityKg)} at {fmtPricePerKg(item.offer.pricePerKg)}</p>
                  <p className="text-[13px] text-muted">{fmtInr(item.offer.quantityKg * item.offer.pricePerKg)} total · {fmtDateTime(item.at)}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={item.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px]", mine ? "rounded-br-md bg-forest text-white" : "rounded-bl-md border border-line bg-white")}>
                {!mine && <p className="mb-0.5 text-[11.5px] font-semibold text-muted">{name(item.by)}</p>}
                {item.text}
                <p className={cx("mt-1 text-[11px]", mine ? "text-sage/80" : "text-muted")}>{fmtDateTime(item.at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="space-y-3 border-t border-line p-5 sm:p-6">
        {open && myTurn && (
          <div className="flex flex-wrap gap-2">
            <Button icon={<Check className="size-4" />} onClick={() => setPending({ kind: "accept", title: "Accept these terms?", body: `${fmtKg(last.quantityKg)} at ${fmtPricePerKg(last.pricePerKg)} (${fmtInr(last.quantityKg * last.pricePerKg)}). The exchange moves to dispatch.`, label: "Accept" })}>Accept</Button>
            <Button variant="secondary" icon={<Repeat2 className="size-4" />} onClick={() => setCounterOpen(!counterOpen)}>Counter</Button>
            <Button variant="ghost" icon={<X className="size-4" />} onClick={() => setPending({ kind: "reject", title: "Decline this request?", body: "The negotiation ends. The other company can send a new request later.", label: "Decline", danger: true })}>Decline</Button>
          </div>
        )}
        {open && !myTurn && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-muted">Waiting for {other?.name} to respond to your offer.</p>
            <Button size="sm" variant="secondary" onClick={() => setCounterOpen(!counterOpen)}>Revise offer</Button>
            <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "cancel", title: "Withdraw your offer?", body: "This cancels the negotiation.", label: "Withdraw", danger: true })}>Withdraw</Button>
          </div>
        )}
        {deal.status === "accepted" && (
          <div className="flex flex-wrap items-center gap-2">
            {isBuyer ? <p className="text-[13px] text-muted">Agreed. Waiting for {other?.name} to dispatch.</p> : <Button icon={<Truck className="size-4" />} onClick={() => done(app.markDispatched(deal.id), "Marked as dispatched", "The buyer will confirm receipt.")}>Mark as dispatched</Button>}
            <Button size="sm" variant="ghost" onClick={() => setPending({ kind: "cancel", title: "Cancel this exchange?", body: "Agreed terms will be voided.", label: "Cancel exchange", danger: true })}>Cancel exchange</Button>
          </div>
        )}
        {deal.status === "in_transit" && (
          isBuyer
            ? <Button icon={<Check className="size-4" />} onClick={() => setPending({ kind: "receive", title: "Confirm receipt?", body: `Confirm you received ${fmtKg(terms.quantityKg)}. The exchange completes and counts toward both companies' impact.`, label: "Confirm receipt" })}>Confirm receipt</Button>
            : <p className="text-[13px] text-muted">Dispatched. Waiting for {other?.name} to confirm receipt.</p>
        )}
        {(deal.status === "completed" || deal.status === "rejected" || deal.status === "cancelled") && (
          <Notice tone={deal.status === "completed" ? "green" : "gold"}>
            {deal.status === "completed" ? "Exchange completed. It now appears in Transactions and the impact dashboard." : `This exchange was ${STATUS_LABELS[deal.status].toLowerCase()}.`}
          </Notice>
        )}

        {counterOpen && open && (
          <form onSubmit={counter} noValidate onChange={() => setError(null)} className="grid gap-3 rounded-2xl border border-line bg-mist p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextField name="qty" label="Quantity (kg)" type="number" inputMode="decimal" defaultValue={last.quantityKg} min={0.001} max={listing.quantityKg} step="any" />
            <TextField name="price" label="Price (₹/kg)" type="number" inputMode="decimal" defaultValue={last.pricePerKg} min={0} step="0.01" />
            <input type="hidden" name="note" value="" />
            <Button type="submit">Send counter</Button>
            {error && <p role="alert" className="text-[13px] font-medium text-error sm:col-span-3">{error}</p>}
          </form>
        )}

        <form onSubmit={send} className="flex gap-2">
          <label htmlFor="deal-message" className="sr-only">Message</label>
          <input id="deal-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder={`Message ${other?.name ?? ""}…`} className="input flex-1 rounded-full" />
          <Button type="submit" disabled={!message.trim()} aria-label="Send message" icon={<Send className="size-4" />} />
        </form>
      </div>

      <ConfirmDialog open={pending !== null} onCancel={() => setPending(null)} onConfirm={confirmPending} title={pending?.title ?? ""} body={pending?.body ?? ""} confirmLabel={pending?.label} danger={pending?.danger} />
    </Card>
  );
}

function Negotiations() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, me } = useApp();
  const company = me!;
  const [filter, setFilter] = useState<"active" | "all">("active");
  const deals = useMemo(
    () => state.deals.filter((d) => d.buyerId === company.id || d.sellerId === company.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.deals, company.id],
  );
  const visible = deals.filter((d) => filter === "all" || ["requested", "negotiating", "accepted", "in_transit"].includes(d.status));
  const selectedId = params.get("deal");
  const selected = deals.find((d) => d.id === selectedId) ?? (selectedId ? undefined : visible[0]);
  const select = (id: string | null) => router.replace(id ? `/negotiations?deal=${id}` : "/negotiations", { scroll: false });
  const autoId = !selectedId ? selected?.id : undefined;
  // Pin the auto-selected exchange in the URL so it stays open after its status changes.
  useEffect(() => {
    if (autoId) router.replace(`/negotiations?deal=${autoId}`, { scroll: false });
  }, [autoId, router]);

  if (deals.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Negotiations" title="Requests & exchanges" />
        <EmptyState icon={<Handshake className="size-5" />} title="No exchanges yet" action={<ButtonLink href="/matches">Find a match</ButtonLink>}>
          Send a purchase request from a match or listing to start negotiating.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Negotiations" title="Requests & exchanges" description="Accept, decline or counter offers, message counterparties, and track each exchange to completion." />
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className={cx("space-y-3", selected && "hidden lg:block")}>
          <div className="flex gap-1 rounded-full border border-line bg-white p-1" role="group" aria-label="Filter exchanges">
            {(["active", "all"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cx("focus-ring flex-1 rounded-full py-1.5 text-[13px] font-semibold", filter === f ? "bg-forest text-white" : "text-muted")}>{f === "active" ? "Active" : "All"}</button>
            ))}
          </div>
          <ul className="space-y-2">
            {visible.map((d) => {
              const listing = state.listings.find((l) => l.id === d.listingId);
              const isBuyer = d.buyerId === company.id;
              const other = state.companies.find((c) => c.id === (isBuyer ? d.sellerId : d.buyerId));
              const last = d.offers[d.offers.length - 1];
              const needsMe = (d.status === "requested" || d.status === "negotiating") && last.byCompanyId !== company.id
                || (d.status === "accepted" && !isBuyer) || (d.status === "in_transit" && isBuyer);
              return (
                <li key={d.id}>
                  <button type="button" onClick={() => select(d.id)} aria-current={selected?.id === d.id} className={cx("focus-ring w-full rounded-2xl border p-4 text-left transition-colors", selected?.id === d.id ? "border-forest bg-white shadow-soft" : "border-line bg-white/70 hover:border-forest/40")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{other?.name}</p>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-muted">{isBuyer ? "Buying" : "Selling"} {listing ? materialName(listing.materialId).toLowerCase() : "material"} · {fmtKg(last.quantityKg)}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] text-muted">
                      <span className="inline-flex items-center gap-1"><MessageSquare className="size-3" />{d.messages.length}</span>
                      {needsMe ? <span className="font-semibold text-gold">Your action</span> : <span>{fmtDateTime(d.updatedAt)}</span>}
                    </div>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && <li className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-[13px] text-muted">No active exchanges. Switch to All to see history.</li>}
          </ul>
        </div>
        <div className={cx("min-w-0", !selected && "hidden lg:block")}>
          {selected ? <Thread key={selected.id} deal={selected} onBack={() => select(null)} /> : <EmptyState title={selectedId ? "Exchange not found" : "Select an exchange"}>Choose a conversation from the list.</EmptyState>}
        </div>
      </div>
    </div>
  );
}

export function NegotiationsView() {
  return <RequireAuth title="Sign in to view negotiations"><Negotiations /></RequireAuth>;
}
