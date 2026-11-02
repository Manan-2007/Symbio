"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { applyAddListing, applyRecordDiversion, applySelectBusiness, applySendEnquiry } from "@/lib/demo-actions";
import type { EnquiryInput, NewListingInput } from "@/lib/demo-actions";
import { DEFAULT_BUSINESS_ID, createSeedState, findBusiness } from "@/lib/seed";
import { clearState, loadState, saveState } from "@/lib/storage";
import type { Business, DemoState, Enquiry, Listing, Result } from "@/lib/types";

/**
 * - loading: client has not read storage yet; nothing is saved.
 * - saved: state is written to localStorage after every change.
 * - unavailable: storage cannot be read or written; state lives in memory only.
 * - corrupt / unsupported: saved data could not be used. It is left untouched
 *   and saving is paused until the user resets.
 */
export type StorageStatus = "loading" | "saved" | "unavailable" | "corrupt" | "unsupported";

type DemoContextValue = {
  state: DemoState;
  storageStatus: StorageStatus;
  isHydrated: boolean;
  selectedBusiness: Business;
  selectBusiness: (businessId: string) => Result<Business>;
  addListing: (input: NewListingInput) => Result<Listing>;
  sendEnquiry: (input: EnquiryInput) => Result<Enquiry>;
  recordDiversion: (enquiryId: string, quantityKg: number) => Result<DemoState>;
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

const NOT_READY: Result<never> = { ok: false, error: "Demo data is still loading." };

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(createSeedState);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  // Latest intended state, so actions can validate and report a result
  // synchronously (e.g. two rapid clicks cannot both create an enquiry).
  const stateRef = useRef(state);
  const isHydrated = storageStatus !== "loading";

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // One-time read from browser storage after mount. Server render and the
  // first client render both show the loading state, so there is no mismatch.
  useEffect(() => {
    const result = loadState();
    /* eslint-disable react-hooks/set-state-in-effect -- syncing once from an external store on mount */
    switch (result.kind) {
      case "loaded":
        stateRef.current = result.state;
        setState(result.state);
        setStorageStatus("saved");
        break;
      case "empty":
        setStorageStatus("saved");
        break;
      case "unavailable":
        setStorageStatus("unavailable");
        break;
      case "corrupt":
      case "unsupported":
        setStorageStatus(result.kind);
        break;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist only once hydrated and only while storage is healthy, so seed
  // data never overwrites saved data and corrupt data is not replaced silently.
  useEffect(() => {
    if (storageStatus !== "saved") return;
    if (!saveState(state)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a failed external write
      setStorageStatus("unavailable");
    }
  }, [state, storageStatus]);

  const selectBusiness = useCallback(
    (businessId: string): Result<Business> => {
      if (!isHydrated) return NOT_READY;
      const result = applySelectBusiness(stateRef.current, businessId);
      if (!result.ok) return result;
      stateRef.current = result.value;
      setState((prev) => {
        const again = applySelectBusiness(prev, businessId);
        return again.ok ? again.value : prev;
      });
      return { ok: true, value: findBusiness(businessId)! };
    },
    [isHydrated],
  );

  const addListing = useCallback(
    (input: NewListingInput): Result<Listing> => {
      if (!isHydrated) return NOT_READY;
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const result = applyAddListing(stateRef.current, input, id, createdAt);
      if (!result.ok) return result;
      stateRef.current = result.value.state;
      setState((prev) => {
        const again = applyAddListing(prev, input, id, createdAt);
        return again.ok ? again.value.state : prev;
      });
      return { ok: true, value: result.value.listing };
    },
    [isHydrated],
  );

  const sendEnquiry = useCallback(
    (input: EnquiryInput): Result<Enquiry> => {
      if (!isHydrated) return NOT_READY;
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const result = applySendEnquiry(stateRef.current, input, id, createdAt);
      if (!result.ok) return result;
      stateRef.current = result.value.state;
      setState((prev) => {
        const again = applySendEnquiry(prev, input, id, createdAt);
        return again.ok ? again.value.state : prev;
      });
      return { ok: true, value: result.value.enquiry };
    },
    [isHydrated],
  );

  const recordDiversion = useCallback((enquiryId: string, quantityKg: number): Result<DemoState> => {
    if (!isHydrated) return NOT_READY;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const result = applyRecordDiversion(stateRef.current, enquiryId, quantityKg, id, createdAt);
    if (!result.ok) return result;
    stateRef.current = result.value;
    setState((prev) => {
      const again = applyRecordDiversion(prev, enquiryId, quantityKg, id, createdAt);
      return again.ok ? again.value : prev;
    });
    return result;
  }, [isHydrated]);

  const resetDemo = useCallback(() => {
    const seed = createSeedState();
    stateRef.current = seed;
    setState(seed);
    // Removes only Symbio's key; the save effect then writes fresh seed data.
    setStorageStatus(clearState() ? "saved" : "unavailable");
  }, []);

  // State is validated on load and on switch, so the fallback is defensive only.
  const selectedBusiness = findBusiness(state.selectedBusinessId) ?? findBusiness(DEFAULT_BUSINESS_ID)!;

  const value = useMemo<DemoContextValue>(
    () => ({ state, storageStatus, isHydrated, selectedBusiness, selectBusiness, addListing, sendEnquiry, recordDiversion, resetDemo }),
    [state, storageStatus, isHydrated, selectedBusiness, selectBusiness, addListing, sendEnquiry, recordDiversion, resetDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside <DemoProvider>.");
  return context;
}
