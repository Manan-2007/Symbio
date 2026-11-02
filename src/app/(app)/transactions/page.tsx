"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Receipt, Search } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { StatusBadge, STATUS_LABELS } from "@/components/deal-status";
import { PAYMENT_LABELS } from "@/components/payment-modal";
import { materialName } from "@/services/catalog";
import { agreedTerms } from "@/services/carbonCalculator";
import type { Deal, DealStatus } from "@/services/types";
import { cx, fmtDate, fmtInr, fmtKg, shortId } from "@/utils/format";

const TX_STATUSES: DealStatus[] = ["accepted", "in_transit", "completed", "cancelled", "rejected"];

function paymentLabel(p: Deal["payment"]): string {
  if (!p) return "Unpaid";
  return `${p.status === "held_in_escrow" ? "In escrow" : p.status === "released" ? "Released" : "Refunded"} · ${PAYMENT_LABELS[p.method]}`;
}

function Transactions() {
  const { state, me } = useApp();
  const { toast } = useToast();
  const company = me!;
  const [status, setStatus] = useState<DealStatus | "all">("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => state.deals
    .filter((d) => (d.buyerId === company.id || d.sellerId === company.id) && TX_STATUSES.includes(d.status))
    .map((d) => {
      const listing = state.listings.find((l) => l.id === d.listingId);
      const terms = agreedTerms(d);
      const agreedAt = d.history.find((h) => h.status === "accepted")?.at ?? d.updatedAt;
      return {
        deal: d, id: `TXN-${shortId(d.id)}`,
        buyer: state.companies.find((c) => c.id === d.buyerId)?.name ?? "—",
        seller: state.companies.find((c) => c.id === d.sellerId)?.name ?? "—",
        material: listing ? materialName(listing.materialId) : "—",
        kg: terms.quantityKg, amount: terms.quantityKg * terms.pricePerKg, date: agreedAt,
      };
    })
    .filter((r) => status === "all" || r.deal.status === status)
    .filter((r) => !query.trim() || [r.id, r.buyer, r.seller, r.material].join(" ").toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [state, company.id, status, query]);

  const totalValue = rows.filter((r) => r.deal.status === "completed").reduce((s, r) => s + r.amount, 0);

  function exportCsv() {
    const header = ["Transaction ID", "Buyer", "Seller", "Material", "Quantity (kg)", "Amount (INR)", "Date", "Status", "Payment", "Payment ref"];
    const lines = rows.map((r) => [r.id, r.buyer, r.seller, r.material, r.kg, r.amount.toFixed(2), r.date.slice(0, 10), STATUS_LABELS[r.deal.status], paymentLabel(r.deal.payment), r.deal.payment?.reference ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "symbio-transactions-demo.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("success", "CSV exported", `${rows.length} row${rows.length === 1 ? "" : "s"} · demo data`);
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Transaction history" title="Agreed exchanges" description="Every exchange from acceptance onward, with escrow payment status. Payments are simulated in this prototype."
        actions={<Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {(["all", ...TX_STATUSES] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={cx("focus-ring rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", status === s ? "border-forest bg-forest text-white" : "border-line-strong bg-white hover:border-forest")}>
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <label htmlFor="tx-search" className="sr-only">Search transactions</label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="tx-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ID, company, material" className="input pl-10" />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Receipt className="size-5" />} title="No transactions">Accepted exchanges appear here.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[13.5px]">
              <thead className="bg-mist text-[12px] text-muted">
                <tr>{["Transaction ID", "Buyer", "Seller", "Material", "Quantity", "Amount", "Date", "Status", "Payment"].map((h) => <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.deal.id} className="transition-colors hover:bg-mist/60">
                    <td className="px-5 py-3.5 font-mono text-[12.5px]"><Link href={`/negotiations?deal=${r.deal.id}`} className="text-forest hover:underline">{r.id}</Link></td>
                    <td className={cx("px-5 py-3.5", r.deal.buyerId === company.id && "font-semibold")}>{r.buyer}</td>
                    <td className={cx("px-5 py-3.5", r.deal.sellerId === company.id && "font-semibold")}>{r.seller}</td>
                    <td className="px-5 py-3.5">{r.material}</td>
                    <td className="px-5 py-3.5 tabular-nums">{fmtKg(r.kg)}</td>
                    <td className="px-5 py-3.5 tabular-nums font-semibold">{fmtInr(r.amount)}</td>
                    <td className="px-5 py-3.5 text-muted">{fmtDate(r.date)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.deal.status} /></td>
                    <td className="px-5 py-3.5 text-[12.5px] text-muted" title={r.deal.payment?.reference}>{paymentLabel(r.deal.payment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t border-line px-5 py-3 text-[13px]">
            <span className="text-muted">{rows.length} transaction{rows.length === 1 ? "" : "s"}</span>
            <span>Completed value: <strong>{fmtInr(totalValue)}</strong></span>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return <RequireAuth title="Sign in to view transactions"><Transactions /></RequireAuth>;
}
