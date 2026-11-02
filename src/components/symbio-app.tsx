"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useDemo } from "./demo-provider";
import type { StorageStatus } from "./demo-provider";
import { BUSINESSES } from "@/lib/seed";
import { Marketplace } from "./marketplace";
import { Matches } from "./matches";
import { Enquiries } from "./enquiries";
import { CarbonDashboard } from "./carbon-dashboard";

const TABS = [
  { id: "marketplace", label: "Marketplace" },
  { id: "matches", label: "Matches" },
  { id: "enquiries", label: "Enquiries" },
  { id: "carbon", label: "Carbon impact" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function SymbioApp() {
  const { isHydrated, storageStatus, selectedBusiness } = useDemo();
  const [tab, setTab] = useState<TabId>("marketplace");
  const [listingId, setListingId] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">Symbio — turn surplus into resources</h1>
        <p className="text-muted">
          A B2B matchmaker for industrial by-products: suppliers list surplus sawdust, cotton offcuts or cardboard, and
          nearby buyers find compatible supply.
        </p>
      </header>

      <DemoNotice status={storageStatus} />

      {!isHydrated ? (
        <p role="status" className="card text-muted">
          Loading demo data…
        </p>
      ) : (
        <>
          <StorageProblem status={storageStatus} />
          <Toolbar />
          <Tabs active={tab} onChange={setTab} />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="focus-ring rounded-xl">
            {tab === "marketplace" && <Marketplace onFindFit={(id) => { setListingId(id); setTab("matches"); }} /> }
            {tab === "matches" && <Matches key={selectedBusiness.id} listingId={listingId} onClear={() => setListingId(null)} onEnquiries={() => setTab("enquiries")} />}
            {tab === "enquiries" && <Enquiries key={selectedBusiness.id} onMatches={() => { setListingId(null); setTab("matches"); }} onCarbon={() => setTab("carbon")} />}
            {tab === "carbon" && <CarbonDashboard onEnquiries={() => setTab("enquiries")} />}
          </div>
        </>
      )}
    </div>
  );
}

function DemoNotice({ status }: { status: StorageStatus }) {
  const storageText =
    status === "unavailable"
      ? "Changes cannot be saved in this browser"
      : status === "corrupt" || status === "unsupported"
        ? "Saving paused"
        : "Data saved in this browser";
  return (
    <div role="note" className="rounded-xl bg-notice px-4 py-3 text-notice-text">
      <p className="font-semibold">Demo · Fictional businesses · {storageText}</p>
      <p className="mt-1 text-sm">
        Each browser keeps its own copy of the data; nothing is shared between devices. Switching profiles is a demo
        story, not a login or access control.
      </p>
    </div>
  );
}

function StorageProblem({ status }: { status: StorageStatus }) {
  if (status === "unavailable") {
    return (
      <p role="alert" className="card border-error text-error">
        Changes cannot be saved in this browser (storage is blocked, full or disabled). You can keep using the demo, but
        changes will be lost on refresh.
      </p>
    );
  }
  if (status === "corrupt" || status === "unsupported") {
    return (
      <div role="alert" className="card border-error">
        <p className="font-semibold text-error">
          {status === "corrupt"
            ? "Saved Symbio data in this browser could not be read."
            : "Saved Symbio data comes from a different version of this demo."}
        </p>
        <p className="mt-1 text-muted">
          The saved data has been left untouched and the demo is showing fresh sample data without saving. Use{" "}
          <strong>Reset demo</strong> below to discard the saved data and start saving again.
        </p>
      </div>
    );
  }
  return null;
}

function Toolbar() {
  const { selectedBusiness, selectBusiness, resetDemo } = useDemo();
  const selectId = useId();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="card flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-semibold">
          Demo profile
        </label>
        <select
          id={selectId}
          value={selectedBusiness.id}
          onChange={(event) => selectBusiness(event.target.value)}
          className="focus-ring min-h-11 rounded-lg border border-line bg-white px-3"
        >
          {BUSINESSES.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name} · {business.city}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted">Acting as {selectedBusiness.name} (fictional).</p>
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm reset">
          <span className="text-sm">Discard local changes and restore sample data?</span>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              resetDemo();
              setConfirming(false);
            }}
          >
            Yes, reset
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
          Reset demo
        </button>
      )}
    </div>
  );
}

function Tabs({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const refs = useRef<Record<TabId, HTMLButtonElement | null>>({ marketplace: null, matches: null, enquiries: null, carbon: null });

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((tab) => tab.id === active);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    onChange(TABS[next].id);
    refs.current[TABS[next].id]?.focus();
  }

  return (
    <div role="tablist" aria-label="Symbio sections" className="grid grid-cols-2 gap-1 border-b border-line sm:flex">
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={onKeyDown}
            className={`focus-ring -mb-px min-h-11 shrink-0 rounded-t-lg border-b-2 px-4 font-semibold ${
              selected ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
