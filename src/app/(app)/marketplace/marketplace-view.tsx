"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Heart, PlusCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ListingCard } from "@/components/listing-card";
import { ButtonLink, Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { SelectField, TextField } from "@/components/ui/field";
import { CATEGORY_ICONS } from "@/components/ui/visuals";
import { CATEGORIES } from "@/services/types";
import type { Category } from "@/services/types";
import { CATEGORY_LABELS, findCity, findMaterial } from "@/services/catalog";
import { cx } from "@/utils/format";

type Sort = "newest" | "price_asc" | "price_desc" | "qty_desc";

type UrlFilters = { query: string; category: Category | ""; materialId: string };

/** Reads deep-link filters: ?material=<id>, ?category=<id>, ?search= / ?q= / ?tag=<text>. */
function filtersFromUrl(params: URLSearchParams): UrlFilters {
  const material = findMaterial(params.get("material") ?? "");
  const rawCategory = params.get("category") ?? "";
  const category = (CATEGORIES as readonly string[]).includes(rawCategory) ? (rawCategory as Category) : material?.category ?? "";
  // An unknown category word (e.g. ?category=coffee) is treated as a search term rather than dropped.
  const text = params.get("search") ?? params.get("q") ?? params.get("tag") ?? (rawCategory && !category ? rawCategory : "");
  return { query: text.trim().slice(0, 100), category, materialId: material?.id ?? "" };
}

/**
 * Remounts the filter state whenever the URL query changes, so in-app links (e.g. from the
 * assistant) apply their filters even when the Marketplace is already open.
 */
export function MarketplaceView() {
  const params = useSearchParams();
  const key = params.toString();
  return <MarketplaceFilters key={key} initial={filtersFromUrl(new URLSearchParams(key))} />;
}

function MarketplaceFilters({ initial }: { initial: UrlFilters }) {
  const router = useRouter();
  const { state, me, isHydrated } = useApp();
  const [query, setQuery] = useState(initial.query);
  const [category, setCategory] = useState<Category | "">(initial.category);
  const [materialId, setMaterialId] = useState(initial.materialId);
  const [cityId, setCityId] = useState("");
  const [minKg, setMinKg] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const saved = useMemo(() => new Set(me ? state.savedListingIds[me.id] ?? [] : []), [me, state.savedListingIds]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minKg.trim() === "" ? 0 : Number(minKg);
    const max = maxPrice.trim() === "" ? Infinity : Number(maxPrice);
    const list = state.listings.filter((l) => {
      if (l.status !== "active") return false;
      const material = findMaterial(l.materialId);
      const company = state.companies.find((c) => c.id === l.companyId);
      if (materialId && l.materialId !== materialId) return false;
      if (category && material?.category !== category) return false;
      if (cityId && l.cityId !== cityId) return false;
      if (Number.isFinite(min) && l.quantityKg < min) return false;
      if (Number.isFinite(max) && l.pricePerKg > max) return false;
      if (savedOnly && !saved.has(l.id)) return false;
      if (q) {
        const hay = [l.title, l.description, material?.name, company?.name, findCity(l.cityId, l.location)?.name].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorters: Record<Sort, (a: typeof list[number], b: typeof list[number]) => number> = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
      price_asc: (a, b) => a.pricePerKg - b.pricePerKg,
      price_desc: (a, b) => b.pricePerKg - a.pricePerKg,
      qty_desc: (a, b) => b.quantityKg - a.quantityKg,
    };
    return list.sort(sorters[sort]);
  }, [state.listings, state.companies, query, category, materialId, cityId, minKg, maxPrice, savedOnly, saved, sort]);

  const locations = [...new Map(state.listings.map((l) => {
    const place = findCity(l.cityId, l.location);
    return [l.cityId, place] as const;
  })).values()].filter((place) => !!place).sort((a, b) => a.name.localeCompare(b.name));

  const activeFilters = [category, materialId, cityId, minKg, maxPrice, savedOnly ? "saved" : "", query].filter(Boolean).length;
  const fromLink = Boolean(initial.query || initial.category || initial.materialId);
  const clear = () => {
    setQuery(""); setCategory(""); setMaterialId(""); setCityId(""); setMinKg(""); setMaxPrice(""); setSavedOnly(false);
    // Drop deep-link params too, so the same link applies its filter again if clicked later.
    if (fromLink) router.replace("/marketplace", { scroll: false });
  };
  const numberError = (v: string, label: string) => (v.trim() !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0) ? `${label} must be 0 or more` : undefined);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Marketplace"
        title="Industrial by-products, ready for a second life"
        description="Browse verified and declared materials from fictional demo companies. Prices are per kilogram."
        actions={me?.roles.includes("generator") ? <ButtonLink href="/listings/new" icon={<PlusCircle className="size-4" />}>Add listing</ButtonLink> : undefined}
      />

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
        <button type="button" onClick={() => { setCategory(""); setMaterialId(""); }} aria-pressed={category === "" && !materialId} className={cx("focus-ring shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors", category === "" && !materialId ? "border-forest bg-forest text-white" : "border-line-strong bg-white hover:border-forest")}>All</button>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c];
          return (
            <button key={c} type="button" onClick={() => { setCategory(category === c ? "" : c); setMaterialId(""); }} aria-pressed={category === c} className={cx("focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors", category === c ? "border-forest bg-forest text-white" : "border-line-strong bg-white hover:border-forest")}>
              <Icon className="size-3.5" aria-hidden />{CATEGORY_LABELS[c]}
            </button>
          );
        })}
      </div>

      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="mp-search" className="sr-only">Search materials, companies or locations</label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input id="mp-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sawdust, PET, Ludhiana…" className="input pl-10" />
          </div>
          <div className="flex gap-2">
            <label htmlFor="mp-sort" className="sr-only">Sort</label>
            <select id="mp-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input w-auto">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="qty_desc">Quantity: largest</option>
            </select>
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="mp-filters" icon={<SlidersHorizontal className="size-4" />}>
              Filters{activeFilters ? ` (${activeFilters})` : ""}
            </Button>
          </div>
        </div>
        {showFilters && (
          <div id="mp-filters" className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <SelectField label="Location" value={cityId} onChange={(e) => setCityId(e.target.value)}>
              <option value="">All locations</option>
              {locations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <TextField label="Minimum quantity (kg)" type="number" inputMode="decimal" min={0} value={minKg} onChange={(e) => setMinKg(e.target.value)} error={numberError(minKg, "Quantity")} />
            <TextField label="Maximum price (₹/kg)" type="number" inputMode="decimal" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} error={numberError(maxPrice, "Price")} />
            <div className="flex items-end gap-2">
              <Button variant={savedOnly ? "primary" : "secondary"} aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)} disabled={!me} title={me ? undefined : "Sign in to save listings"} icon={<Heart className="size-4" />}>Saved</Button>
            </div>
          </div>
        )}
      </div>

      {(materialId || (fromLink && query)) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sage bg-sage-50 px-4 py-3 text-[14px]">
          <span className="text-muted">Showing</span>
          {materialId && (
            <button type="button" onClick={() => setMaterialId("")} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-semibold text-forest shadow-soft hover:bg-mist" aria-label={`Remove material filter ${findMaterial(materialId)?.name}`}>
              {findMaterial(materialId)?.name}<X className="size-3.5" aria-hidden />
            </button>
          )}
          {fromLink && query && (
            <button type="button" onClick={() => setQuery("")} className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-semibold text-forest shadow-soft hover:bg-mist" aria-label={`Remove search ${query}`}>
              “{query}”<X className="size-3.5" aria-hidden />
            </button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={clear} icon={<X className="size-3.5" />}>Clear filter</Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-muted" role="status">{isHydrated ? `${results.length} listing${results.length === 1 ? "" : "s"}` : "Loading listings…"}</p>
        {activeFilters > 0 && <Button size="sm" variant="ghost" onClick={clear} icon={<X className="size-3.5" />}>Clear filters</Button>}
      </div>

      {!isHydrated ? (
        <LoadingBlock label="Loading listings" />
      ) : results.length === 0 ? (
        <EmptyState icon={<Search className="size-5" />} title="No listings match" action={<Button variant="secondary" onClick={clear}>Clear filters</Button>}>
          Try a different category, a wider location, or a higher price limit.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
