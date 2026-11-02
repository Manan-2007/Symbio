import type { AppState, DealStatus } from "./types";
import { materialName } from "./catalog";
import { matchesForRequirement } from "./matchingEngine";

// In-app notifications derived from activity (prototype). A production build would persist them
// server-side and add email/SMS delivery.

export type NotificationKind = "deal" | "payment" | "message" | "verification" | "match";
export type AppNotification = { id: string; kind: NotificationKind; at: string; title: string; body: string; href: string; unread: boolean };

const DEAL_TITLES: Partial<Record<DealStatus, string>> = {
  requested: "New purchase request",
  negotiating: "Counter-offer received",
  accepted: "Terms accepted",
  rejected: "Request declined",
  in_transit: "Material dispatched",
  completed: "Receipt confirmed",
  cancelled: "Exchange cancelled",
};

const NEW_MATCH_WINDOW_MS = 14 * 86_400_000;

/** `now` anchors the "new match" window only; every event, however recent, is included. */
export function notificationsFor(state: AppState, companyId: string, now: string): AppNotification[] {
  const seenAt = state.notificationsSeenAt?.[companyId] ?? "";
  const name = (id: string) => state.companies.find((c) => c.id === id)?.name ?? "A company";
  const out: Omit<AppNotification, "unread">[] = [];

  for (const deal of state.deals) {
    if (deal.buyerId !== companyId && deal.sellerId !== companyId) continue;
    const listing = state.listings.find((l) => l.id === deal.listingId);
    const material = listing ? materialName(listing.materialId).toLowerCase() : "material";
    const href = `/negotiations?deal=${deal.id}`;
    // Counter-offers are offers after the first one.
    deal.offers.slice(1).forEach((o) => {
      if (o.byCompanyId !== companyId) out.push({ id: `${o.id}-offer`, kind: "deal", at: o.createdAt, title: "Counter-offer received", body: `${name(o.byCompanyId)} offered ${o.quantityKg.toLocaleString("en-IN")} kg at ₹${o.pricePerKg}/kg for ${material}.`, href });
    });
    deal.history.forEach((h, i) => {
      if (h.byCompanyId === companyId || h.status === "negotiating") return;
      out.push({ id: `${deal.id}-h${i}`, kind: "deal", at: h.at, title: DEAL_TITLES[h.status] ?? "Exchange updated", body: `${name(h.byCompanyId)} · ${material}`, href });
    });
    deal.messages.forEach((m) => {
      if (m.companyId !== companyId) out.push({ id: `${m.id}-msg`, kind: "message", at: m.createdAt, title: `Message from ${name(m.companyId)}`, body: m.text.length > 90 ? `${m.text.slice(0, 90)}…` : m.text, href });
    });
    const p = deal.payment;
    if (p && deal.sellerId === companyId) {
      out.push({ id: `${deal.id}-paid`, kind: "payment", at: p.paidAt, title: "Payment held in escrow", body: `₹${p.amountInr.toLocaleString("en-IN")} from ${name(deal.buyerId)}. You can dispatch now.`, href });
    }
    if (p?.settledAt) {
      const released = p.status === "released";
      if (released ? deal.sellerId === companyId : deal.buyerId === companyId) {
        out.push({ id: `${deal.id}-settled`, kind: "payment", at: p.settledAt, title: released ? "Payment released" : "Payment refunded", body: `₹${p.amountInr.toLocaleString("en-IN")} · ref ${p.reference}`, href: "/transactions" });
      }
    }
  }

  const me = state.companies.find((c) => c.id === companyId);
  const v = me?.verification;
  if (v?.reviewedAt) {
    out.push({ id: `${companyId}-verif`, kind: "verification", at: v.reviewedAt, title: v.status === "verified" ? "Company verified" : "Verification needs attention", body: v.status === "verified" ? "Your verified badge is now visible to partners." : "Please re-submit your documents.", href: `/companies/${companyId}` });
  }

  // Fresh listings that match this company's open requirements.
  const cutoff = Date.parse(now) - NEW_MATCH_WINDOW_MS;
  for (const r of state.requirements.filter((x) => x.companyId === companyId && x.status === "open")) {
    for (const m of matchesForRequirement(r, state.listings)) {
      if (Date.parse(m.listing.createdAt) >= cutoff && Date.parse(m.listing.createdAt) > Date.parse(me?.createdAt ?? "")) {
        out.push({ id: `${m.id}-match`, kind: "match", at: m.listing.createdAt, title: `New ${m.score}% match`, body: `${name(m.listing.companyId)} listed ${materialName(m.listing.materialId).toLowerCase()} near you.`, href: `/matches/${m.id}` });
      }
    }
  }

  return out
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30)
    .map((n) => ({ ...n, unread: n.at > seenAt }));
}
