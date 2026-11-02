"use client";

import { useEffect, useState } from "react";
import { CITIES } from "@/services/catalog";
import { haversineKm } from "@/services/geo";
import type { City } from "@/services/types";
import { cx } from "@/utils/format";

type Point = Pick<City, "lat" | "lng">;
export type MapMarker = Point & { id: string; label: string; tone: "self" | "generator" | "consumer" | "both"; onSelect?: () => void; selected?: boolean };
export type MapRoute = { from: Point; to: Point };

const TONES = { self: "#a8834a", generator: "#1e4d36", consumer: "#57a773", both: "#4f7f92" } as const;
const W = 800;
const H = 560;

// Schematic fallback: equirectangular projection over the demo region with padding.
const LAT = [Math.min(...CITIES.map((c) => c.lat)) - 0.35, Math.max(...CITIES.map((c) => c.lat)) + 0.35];
const LNG = [Math.min(...CITIES.map((c) => c.lng)) - 0.45, Math.max(...CITIES.map((c) => c.lng)) + 0.45];
function project({ lat, lng }: Point) {
  return { x: ((lng - LNG[0]) / (LNG[1] - LNG[0])) * W, y: H - ((lat - LAT[0]) / (LAT[1] - LAT[0])) * H };
}
const key = (p: Point) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;

function SchematicMap({ markers, route }: { markers: MapMarker[]; route?: MapRoute | null }) {
  const groups = new Map<string, MapMarker[]>();
  for (const m of markers) groups.set(key(m), [...(groups.get(key(m)) ?? []), m]);
  const a = route && project(route.from);
  const b = route && project(route.to);
  const km = route ? haversineKm(route.from, route.to) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Schematic map of ${markers.length} companies${km !== null ? `, ${Math.round(km)} km straight-line route` : ""}`}>
      <defs>
        <radialGradient id="map-land" cx="45%" cy="40%" r="75%"><stop offset="0" stopColor="#eef4ea" /><stop offset="1" stopColor="#dfe9da" /></radialGradient>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#d3dfcf" strokeWidth="0.6" /></pattern>
      </defs>
      <rect width={W} height={H} fill="#f4f2ea" />
      <path d="M60 40 C 220 10, 420 30, 560 80 C 700 130, 780 260, 760 380 C 740 500, 640 540, 520 530 C 380 520, 260 470, 160 420 C 60 370, 20 260, 30 160 C 36 100, 40 60, 60 40 Z" fill="url(#map-land)" stroke="#cbd9c5" />
      <rect width={W} height={H} fill="url(#map-grid)" opacity="0.5" />
      {CITIES.map((c) => {
        const p = project(c);
        return <text key={c.id} x={p.x} y={p.y + 30} textAnchor="middle" fontSize="13" fill="#5d675f" paintOrder="stroke" stroke="#f4f2ea" strokeWidth="4">{c.name}</text>;
      })}
      {a && b && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#a8834a" strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round" />}
      {[...groups.values()].map((here) => {
        const p = project(here[0]);
        const tone = here.find((m) => m.tone === "self")?.tone ?? here[0].tone;
        const select = here[0].onSelect;
        return (
          <g key={key(here[0])} transform={`translate(${p.x} ${p.y})`} role={select ? "button" : undefined} tabIndex={select ? 0 : undefined}
            aria-label={select ? here.map((m) => m.label).join(", ") : undefined} onClick={select}
            onKeyDown={(e) => { if (select && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(); } }}
            className={select ? "cursor-pointer outline-none" : undefined}>
            <circle r={here.some((m) => m.selected) ? 22 : 16} fill={TONES[tone]} opacity="0.15" />
            <circle r="9" fill={TONES[tone]} stroke="#fff" strokeWidth="3" />
            {here.length > 1 && <g transform="translate(10 -10)"><circle r="8" fill="#fff" stroke="#e3dfd1" /><text textAnchor="middle" y="3.5" fontSize="10" fontWeight="700" fill="#1f2620">{here.length}</text></g>}
          </g>
        );
      })}
    </svg>
  );
}

type RouteInfo = { distanceKm: number; durationMin: number } | "unavailable" | null;

/** Driving distance for a route via /api/geo/route (Geoapify). */
function useRouteInfo(route?: MapRoute | null): RouteInfo {
  const [info, setInfo] = useState<{ key: string; value: RouteInfo }>({ key: "", value: null });
  const routeKey = route ? `${key(route.from)}|${key(route.to)}` : "";
  useEffect(() => {
    if (!route) return;
    let alive = true;
    fetch(`/api/geo/route?from=${route.from.lat},${route.from.lng}&to=${route.to.lat},${route.to.lng}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { distanceKm: number; durationMin: number }) => { if (alive) setInfo({ key: routeKey, value: { distanceKm: d.distanceKm, durationMin: d.durationMin } }); })
      .catch(() => { if (alive) setInfo({ key: routeKey, value: "unavailable" }); });
    return () => { alive = false; };
    // routeKey captures the route's identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);
  return route && info.key === routeKey ? info.value : null;
}

/**
 * Real map tiles from Geoapify (server-proxied static map, key never in the browser) with the
 * driving route; falls back to a schematic SVG if maps are not configured or fail to load.
 */
export function MapView({ markers, route, className }: { markers: MapMarker[]; route?: MapRoute | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const routeInfo = useRouteInfo(route);
  const straight = route ? haversineKm(route.from, route.to) : null;

  const params = new URLSearchParams({ w: String(W), h: String(H) });
  params.set("m", markers.slice(0, 40).map((m) => `${m.lat},${m.lng},${TONES[m.tone]}`).join("|"));
  if (route) {
    params.set("from", `${route.from.lat},${route.from.lng}`);
    params.set("to", `${route.to.lat},${route.to.lng}`);
  }
  const src = `/api/geo/staticmap?${params.toString()}`;
  const live = failedSrc !== src;
  const selectable = markers.filter((m) => m.onSelect);

  return (
    <figure className={cx("overflow-hidden rounded-card border border-line bg-white", className)}>
      {live ? (
        <div className="relative aspect-[10/7] bg-mist">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic map image from our own API route */}
          <img
            key={src}
            src={src}
            alt={`Map of ${markers.length} compan${markers.length === 1 ? "y" : "ies"}${route ? " with the driving route" : ""}`}
            className={cx("size-full object-cover transition-opacity duration-300", loadedSrc === src ? "opacity-100" : "opacity-0")}
            onLoad={() => setLoadedSrc(src)}
            onError={() => setFailedSrc(src)}
          />
          {loadedSrc !== src && <div className="absolute inset-0 animate-pulse bg-cream" aria-hidden />}
        </div>
      ) : (
        <SchematicMap markers={markers} route={route} />
      )}
      {live && selectable.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2" role="group" aria-label="Map markers">
          {selectable.map((m) => (
            <button key={m.id} type="button" onClick={m.onSelect} aria-pressed={m.selected} className={cx("focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium", m.selected ? "border-forest bg-sage-50" : "border-line hover:border-forest")}>
              <span className="size-2 rounded-full" style={{ background: TONES[m.tone] }} />{m.label}
            </button>
          ))}
        </div>
      )}
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[12px] text-muted">
        <span>
          {live && <span className="mr-1">© OpenStreetMap contributors · Geoapify ·</span>}{" "}
          {route && routeInfo && routeInfo !== "unavailable"
            ? <><strong className="text-ink">{routeInfo.distanceKm.toFixed(1)} km by road</strong> · ~{Math.round(routeInfo.durationMin)} min drive · {straight!.toFixed(1)} km straight-line</>
            : route ? <>{straight!.toFixed(1)} km straight-line{routeInfo === "unavailable" ? " · road route unavailable" : " · fetching road route…"}</>
            : live ? "Approximate city-centre locations" : "Schematic map · approximate city centres (live maps unavailable)"}
        </span>
        <span className="flex gap-3">
          {(["self", "generator", "consumer", "both"] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: TONES[t] }} />{t === "self" ? "You" : t === "both" ? "Both" : t === "generator" ? "Generator" : "Consumer"}</span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
