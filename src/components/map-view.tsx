"use client";

import { useEffect, useRef, useState } from "react";
import { CITIES, findCity } from "@/services/catalog";
import { integrations, isMapsConfigured } from "@/services/integrations";
import { haversineKm } from "@/services/geo";
import { cx } from "@/utils/format";

export type MapMarker = { id: string; cityId: string; label: string; tone: "self" | "generator" | "consumer" | "both"; onSelect?: () => void; selected?: boolean };
export type MapRoute = { fromCityId: string; toCityId: string };

const TONES = { self: "#a8834a", generator: "#1e4d36", consumer: "#57a773", both: "#4f7f92" } as const;

// Equirectangular projection over the demo region with padding.
const LAT = [Math.min(...CITIES.map((c) => c.lat)) - 0.35, Math.max(...CITIES.map((c) => c.lat)) + 0.35];
const LNG = [Math.min(...CITIES.map((c) => c.lng)) - 0.45, Math.max(...CITIES.map((c) => c.lng)) + 0.45];
const W = 800;
const H = 560;
function project(lat: number, lng: number) {
  return { x: ((lng - LNG[0]) / (LNG[1] - LNG[0])) * W, y: H - ((lat - LAT[0]) / (LAT[1] - LAT[0])) * H };
}

/** Schematic map used when Google Maps is not configured. Positions are approximate city centres. */
function SchematicMap({ markers, route, className }: { markers: MapMarker[]; route?: MapRoute | null; className?: string }) {
  const byCity = new Map<string, MapMarker[]>();
  for (const m of markers) byCity.set(m.cityId, [...(byCity.get(m.cityId) ?? []), m]);
  const from = route ? findCity(route.fromCityId) : undefined;
  const to = route ? findCity(route.toCityId) : undefined;
  const a = from && project(from.lat, from.lng);
  const b = to && project(to.lat, to.lng);
  const km = from && to ? haversineKm(from, to) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cx("h-auto w-full", className)} role="img" aria-label={`Schematic map of ${markers.length} companies across Punjab, Haryana and Delhi${km !== null ? `, with a ${Math.round(km)} km straight-line route` : ""}`}>
      <defs>
        <radialGradient id="map-land" cx="45%" cy="40%" r="75%">
          <stop offset="0" stopColor="#eef4ea" />
          <stop offset="1" stopColor="#dfe9da" />
        </radialGradient>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#d3dfcf" strokeWidth="0.6" /></pattern>
      </defs>
      <rect width={W} height={H} fill="#f4f2ea" />
      <path d="M60 40 C 220 10, 420 30, 560 80 C 700 130, 780 260, 760 380 C 740 500, 640 540, 520 530 C 380 520, 260 470, 160 420 C 60 370, 20 260, 30 160 C 36 100, 40 60, 60 40 Z" fill="url(#map-land)" stroke="#cbd9c5" />
      <rect width={W} height={H} fill="url(#map-grid)" opacity="0.5" />
      {/* rivers (decorative) */}
      <path d="M90 120 C 200 180, 260 170, 330 240 C 400 310, 470 320, 560 420" fill="none" stroke="#bcd5df" strokeWidth="3" opacity="0.7" />
      <path d="M150 60 C 230 110, 300 100, 360 150" fill="none" stroke="#bcd5df" strokeWidth="2" opacity="0.6" />

      {a && b && (
        <g>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#a8834a" strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round" className="animate-[orbit-flow_3s_linear_infinite]" />
          <g transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 16})`}>
            <rect x="-54" y="-14" width="108" height="26" rx="13" fill="#fff" stroke="#e3dfd1" />
            <text textAnchor="middle" y="4" fontSize="12.5" fontWeight="700" fill="#1f2620">~{km!.toFixed(1)} km</text>
          </g>
        </g>
      )}

      {CITIES.map((c) => {
        const p = project(c.lat, c.lng);
        const here = byCity.get(c.id) ?? [];
        const selected = here.some((m) => m.selected);
        const tone = here.find((m) => m.tone === "self")?.tone ?? here[0]?.tone;
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`}>
            {here.length > 0 ? (
              <g
                role={here[0].onSelect ? "button" : undefined}
                tabIndex={here[0].onSelect ? 0 : undefined}
                aria-label={here[0].onSelect ? `${c.name}: ${here.map((m) => m.label).join(", ")}` : undefined}
                onClick={here[0].onSelect}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && here[0].onSelect) { e.preventDefault(); here[0].onSelect(); } }}
                className={here[0].onSelect ? "cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-emerald" : undefined}
              >
                <circle r={selected ? 22 : 16} fill={TONES[tone!]} opacity="0.15" stroke="transparent" strokeWidth="3" />
                <circle r="9" fill={TONES[tone!]} stroke="#fff" strokeWidth="3" />
                {here.length > 1 && (
                  <g transform="translate(10 -10)"><circle r="8" fill="#fff" stroke="#e3dfd1" /><text textAnchor="middle" y="3.5" fontSize="10" fontWeight="700" fill="#1f2620">{here.length}</text></g>
                )}
              </g>
            ) : (
              <circle r="3.5" fill="#9aa39b" />
            )}
            <text y={here.length ? 30 : 16} textAnchor="middle" fontSize="13" fontWeight={here.length ? 700 : 500} fill={here.length ? "#1f2620" : "#7c857d"} paintOrder="stroke" stroke="#f4f2ea" strokeWidth="4">{c.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

type GoogleMapsWindow = Window & { google?: { maps?: unknown } };
let loader: Promise<void> | null = null;
function loadGoogleMaps(key: string): Promise<void> {
  if ((window as GoogleMapsWindow).google?.maps) return Promise.resolve();
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { loader = null; reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(script);
  });
  return loader;
}

/** Live Google map (only when NEXT_PUBLIC_ENABLE_MAPS=true and a browser key exist). Falls back on any failure. */
function LiveMap({ markers, route, className, onError }: { markers: MapMarker[]; route?: MapRoute | null; className?: string; onError: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps(integrations.maps.browserKey).then(() => {
      if (cancelled || !ref.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Maps SDK is loaded at runtime without bundled types
      const g = (window as any).google.maps;
      const map = new g.Map(ref.current, { center: { lat: 30.8, lng: 76.2 }, zoom: 7, disableDefaultUI: true, zoomControl: true });
      for (const m of markers) {
        const c = findCity(m.cityId);
        if (!c) continue;
        const marker = new g.Marker({ position: { lat: c.lat, lng: c.lng }, map, title: m.label });
        if (m.onSelect) marker.addListener("click", m.onSelect);
      }
      const from = route && findCity(route.fromCityId);
      const to = route && findCity(route.toCityId);
      if (from && to) new g.Polyline({ path: [from, to].map((c) => ({ lat: c.lat, lng: c.lng })), map, strokeColor: "#a8834a", strokeWeight: 3, geodesic: true });
    }).catch(onError);
    return () => { cancelled = true; };
  }, [markers, route, onError]);
  return <div ref={ref} className={cx("aspect-[10/7] w-full", className)} />;
}

export function MapView({ markers, route, className }: { markers: MapMarker[]; route?: MapRoute | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const live = isMapsConfigured() && !failed;
  return (
    <figure className={cx("overflow-hidden rounded-card border border-line bg-white", className)}>
      {live ? <LiveMap markers={markers} route={route} onError={() => setFailed(true)} /> : <SchematicMap markers={markers} route={route} />}
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[12px] text-muted">
        <span>{live ? "Google Maps · straight-line route shown, not a driving route" : "Schematic map · approximate city centres · mock straight-line distances (live maps not configured)"}</span>
        <span className="flex gap-3">
          {(["self", "generator", "consumer", "both"] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: TONES[t] }} />{t === "self" ? "You" : t === "both" ? "Both" : t === "generator" ? "Generator" : "Consumer"}</span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
