"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { locationFromGeocode } from "@/services/location";
import type { City } from "@/services/types";

/** Explicit search and selection: never silently pick the first ambiguous result. */
export function LocationPicker({ label = "Location", value, onChange, className = "" }: {
  label?: string; value: City | null; onChange: (location: City | null) => void; className?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function search() {
    if (query.trim().length < 2) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setResults([]);
    setError(null);
    try {
      const response = await fetch(`/api/geo/geocode?text=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
      const data = await response.json() as { results?: unknown[] };
      if (!response.ok) throw new Error(response.status === 503
        ? "Location search is not available yet. Please try again later."
        : "Location search could not be completed. Please try again.");
      const hits = Array.isArray(data.results) ? data.results.map(locationFromGeocode).filter((c): c is City => !!c) : [];
      if (controller.signal.aborted) return;
      setResults(hits);
      if (!hits.length) setError("No places found. Try adding the state or country to your search.");
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Location search failed.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="label">{label}</label>
      <div className="flex min-w-0 gap-2">
        <input id={id} className="input min-w-0 flex-1" value={query} maxLength={200}
          placeholder="Search any city, area or address" autoComplete="off"
          aria-describedby={`${id}-status`} aria-invalid={!!error}
          onChange={(e) => {
            request.current?.abort(); setBusy(false); setQuery(e.target.value);
            setResults([]); setError(null); onChange(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void search(); }
            if (e.key === "Escape") { setResults([]); }
          }} />
        <Button variant="secondary" aria-label="Search places" disabled={busy || query.trim().length < 2}
          onClick={() => void search()} icon={busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} />
      </div>
      <div id={`${id}-status`} className="mt-2 text-[12px]" aria-live="polite">
        {busy ? <p className="text-muted">Searching places…</p> : error ? <p role="alert" className="text-error">{error}</p>
          : value ? <p className="flex items-start gap-1.5 break-words text-forest"><Check className="mt-0.5 size-3.5 shrink-0" />{value.name}</p>
          : <p className="text-muted">Search, then choose the correct result. Include a country for more precise results.</p>}
      </div>
      {results.length > 0 && (
        <ul aria-label={`${label} search results`} className="mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line bg-white">
          {results.map((place) => (
            <li key={place.id}>
              <button type="button" className="focus-ring flex w-full items-start gap-2 px-3 py-3 text-left text-[13px] hover:bg-sage-50"
                onClick={() => { request.current?.abort(); onChange(place); setQuery(place.name); setResults([]); setError(null); }}>
                <MapPin className="mt-0.5 size-4 shrink-0 text-forest" /><span className="min-w-0 break-words">{place.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
