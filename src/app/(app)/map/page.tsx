"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, MapPin, Navigation, Search, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { MapView } from "@/components/map-view";
import type { MapMarker } from "@/components/map-view";
import { Card, EmptyState, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { SelectField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CITIES, cityName, findCity } from "@/services/catalog";
import { haversineKm } from "@/services/geo";
import { cx } from "@/utils/format";

type RoleFilter = "all" | "generator" | "consumer";
type Origin = { lat: number; lng: number; label: string };

export default function MapPage() {
  const { state, me, isHydrated } = useApp();
  const { toast } = useToast();
  const [custom, setCustom] = useState<Origin | null>(null);
  const [cityId, setCityId] = useState("");
  const [radius, setRadius] = useState(150);
  const [role, setRole] = useState<RoleFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const baseCity = findCity(cityId || me?.cityId || "ludhiana")!;
  const origin = useMemo<Origin>(() => custom ?? { lat: baseCity.lat, lng: baseCity.lng, label: baseCity.name }, [custom, baseCity]);

  const nearby = useMemo(() => state.companies
    .filter((c) => c.id !== me?.id && (role === "all" || c.roles.includes(role)))
    .map((c) => ({ company: c, city: findCity(c.cityId)!, km: haversineKm(origin, findCity(c.cityId)!) }))
    .filter((r) => r.km <= radius)
    .sort((a, b) => a.km - b.km || a.company.name.localeCompare(b.company.name)), [state.companies, me, role, origin, radius]);

  const selected = nearby.find((n) => n.company.id === selectedId) ?? null;
  const markers = useMemo<MapMarker[]>(() => [
    { id: "origin", lat: origin.lat, lng: origin.lng, label: custom ? origin.label.split(",")[0] : me ? `${me.name} (you)` : origin.label, tone: "self" },
    ...nearby.map(({ company, city }) => ({
      id: company.id, lat: city.lat, lng: city.lng, label: company.name, selected: company.id === selectedId,
      tone: (company.roles.length > 1 ? "both" : company.roles[0]) as MapMarker["tone"],
      onSelect: () => setSelectedId(company.id),
    })),
  ], [origin.lat, origin.lng, origin.label, custom, me, nearby, selectedId]);
  const route = useMemo(() => (selected ? { from: { lat: origin.lat, lng: origin.lng }, to: selected.city } : null), [selected, origin.lat, origin.lng]);

  async function search(e: FormEvent) {
    e.preventDefault();
    const text = query.trim();
    if (text.length < 2) return;
    setSearching(true);
    try {
      const r = await fetch(`/api/geo/geocode?text=${encodeURIComponent(text)}`);
      const data = (await r.json()) as { results?: Origin[]; error?: string };
      const hit = data.results?.[0];
      if (!r.ok || !hit) toast("error", r.status === 503 ? "Location search is not configured" : "No place found", r.status === 503 ? "Set GEOAPIFY_API_KEY on the server." : "Try a city or industrial area in India.");
      else { setCustom({ lat: hit.lat, lng: hit.lng, label: hit.label }); setSelectedId(null); toast("success", "Location set", hit.label); }
    } catch {
      toast("error", "Location search failed");
    } finally {
      setSearching(false);
    }
  }

  if (!isHydrated) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Location-based matching" title="Who's nearby" description="Find generators and consumers around any location. Radius filtering uses straight-line distance; select a company to see the driving route and road distance." />
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="place" className="sr-only">Search a place</label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="place" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search an address or industrial area, e.g. Focal Point, Ludhiana" className="input pl-10" maxLength={200} />
        </div>
        <Button type="submit" variant="secondary" disabled={searching || query.trim().length < 2} icon={searching ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}>Set as origin</Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Or start from a city" value={custom ? "" : cityId || me?.cityId || "ludhiana"} onChange={(e) => { setCityId(e.target.value); setCustom(null); setSelectedId(null); }}>
          {custom && <option value="">{custom.label.split(",")[0]} (searched)</option>}
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <MapView markers={markers} route={route} />
        <Card className="flex max-h-[640px] flex-col">
          <div className="border-b border-line p-5">
            <h2 className="font-display text-[24px] text-forest-950">{nearby.length} compan{nearby.length === 1 ? "y" : "ies"} within {radius} km</h2>
            <p className="truncate text-[13px] text-muted">From {origin.label} · select one to draw the route</p>
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
              <p><span className="font-semibold">{selected.company.name}</span> · {cityName(selected.company.cityId)}. Road distance is shown under the map.</p>
              <Link href={`/companies/${selected.company.id}`} className="mt-2 inline-block font-semibold text-emerald hover:underline">View company profile →</Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
