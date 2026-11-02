"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Navigation, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { MapView } from "@/components/map-view";
import type { MapMarker } from "@/components/map-view";
import { Card, EmptyState, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/field";
import { CITIES, cityName, findCity } from "@/services/catalog";
import { haversineKm } from "@/services/geo";
import { cx } from "@/utils/format";

type RoleFilter = "all" | "generator" | "consumer";

export default function MapPage() {
  const { state, me, isHydrated } = useApp();
  const [originId, setOriginId] = useState<string>("");
  const [radius, setRadius] = useState(150);
  const [role, setRole] = useState<RoleFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const origin = findCity(originId || me?.cityId || "ludhiana")!;
  const nearby = useMemo(() => state.companies
    .filter((c) => c.id !== me?.id && (role === "all" || c.roles.includes(role)))
    .map((c) => ({ company: c, km: haversineKm(origin, findCity(c.cityId)!) }))
    .filter((r) => r.km <= radius)
    .sort((a, b) => a.km - b.km || a.company.name.localeCompare(b.company.name)), [state.companies, me, role, origin, radius]);

  const selected = nearby.find((n) => n.company.id === selectedId) ?? null;
  const markers = useMemo<MapMarker[]>(() => [
    ...(me ? [{ id: me.id, cityId: me.cityId, label: `${me.name} (you)`, tone: "self" as const }] : []),
    ...nearby.map(({ company }) => ({
      id: company.id, cityId: company.cityId, label: company.name, selected: company.id === selectedId,
      tone: (company.roles.length > 1 ? "both" : company.roles[0]) as MapMarker["tone"],
      onSelect: () => setSelectedId(company.id),
    })),
  ], [me, nearby, selectedId]);

  if (!isHydrated) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Location-based matching" title="Who's nearby" description="Find generators and consumers around a location. Distances are straight-line estimates between approximate city centres, not driving routes." />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="From" value={originId || me?.cityId || "ludhiana"} onChange={(e) => { setOriginId(e.target.value); setSelectedId(null); }}>
          {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}{me?.cityId === c.id ? " (your location)" : ""}</option>)}
        </SelectField>
        <div>
          <label htmlFor="radius" className="label">Radius: {radius} km</label>
          <input id="radius" type="range" min={10} max={400} step={10} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="mt-3 w-full accent-forest" />
        </div>
        <SelectField label="Show" value={role} onChange={(e) => setRole(e.target.value as RoleFilter)}>
          <option value="all">All companies</option>
          <option value="generator">Waste generators</option>
          <option value="consumer">Waste consumers</option>
        </SelectField>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <MapView markers={markers} route={selected ? { fromCityId: origin.id, toCityId: selected.company.cityId } : null} />
        <Card className="flex max-h-[600px] flex-col">
          <div className="border-b border-line p-5">
            <h2 className="font-display text-[24px] text-forest-950">{nearby.length} compan{nearby.length === 1 ? "y" : "ies"} within {radius} km</h2>
            <p className="text-[13px] text-muted">From {cityName(origin.id)} · select one to draw the route</p>
          </div>
          {nearby.length === 0 ? (
            <div className="p-5"><EmptyState icon={<MapPin className="size-5" />} title="Nobody in range">Widen the radius or choose another location.</EmptyState></div>
          ) : (
            <ul className="flex-1 divide-y divide-line overflow-y-auto">
              {nearby.map(({ company, km }) => (
                <li key={company.id}>
                  <button type="button" onClick={() => setSelectedId(company.id)} aria-pressed={selectedId === company.id} className={cx("focus-ring flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors", selectedId === company.id ? "bg-sage-50" : "hover:bg-mist")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-display text-base font-semibold text-forest-900">{company.name.charAt(0)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 truncate text-[14px] font-semibold">{company.name}{company.verified && <ShieldCheck className="size-3.5 shrink-0 text-emerald" aria-label="Verified" />}</span>
                      <span className="block truncate text-[12px] text-muted">{company.industry} · {cityName(company.cityId)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold tabular-nums text-forest"><Navigation className="size-3.5" aria-hidden />{km < 1 ? "<1" : Math.round(km)} km</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <div className="border-t border-line p-4 text-[13px]">
              <p><span className="font-semibold">{selected.company.name}</span> is ~{selected.km.toFixed(1)} km from {cityName(origin.id)} (mock straight-line distance).</p>
              <Link href={`/companies/${selected.company.id}`} className="mt-2 inline-block font-semibold text-emerald hover:underline">View company profile →</Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
