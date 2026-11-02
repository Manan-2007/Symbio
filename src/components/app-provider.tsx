"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as A from "@/services/actions";
import type { Ctx } from "@/services/actions";
import { createSeedState } from "@/services/demoData";
import { hashPassword, verifyPassword } from "@/services/password";
import { clearState, loadState, saveState } from "@/services/storageService";
import type { AppState, Company, Deal, Listing, Requirement, Result } from "@/services/types";

/**
 * loading: storage not read yet (server render and first client render).
 * saved: every change is written to localStorage.
 * unavailable: storage blocked or full; state lives in memory only.
 * corrupt / unsupported: saved data left untouched, saving paused until reset.
 */
export type StorageStatus = "loading" | "saved" | "unavailable" | "corrupt" | "unsupported";

type Ops = {
  loginWithEmail: (email: string, password: string) => Promise<Result<AppState>>;
  loginAsCompany: (companyId: string) => Result<AppState>;
  logout: () => void;
  register: (input: A.RegisterInput) => Promise<Result<AppState>>;
  updateProfile: (input: A.ProfileInput) => Result<AppState>;
  addListing: (input: A.ListingInput) => Result<Listing>;
  setListingStatus: (id: string, status: Listing["status"]) => Result<AppState>;
  addRequirement: (input: A.RequirementInput) => Result<Requirement>;
  setRequirementStatus: (id: string, status: Requirement["status"]) => Result<AppState>;
  toggleSaved: (listingId: string) => Result<boolean>;
  requestDeal: (input: A.OfferInput & { listingId: string; requirementId: string | null }) => Result<Deal>;
  counterOffer: (dealId: string, input: A.OfferInput) => Result<AppState>;
  acceptDeal: (dealId: string) => Result<AppState>;
  rejectDeal: (dealId: string) => Result<AppState>;
  cancelDeal: (dealId: string) => Result<AppState>;
  markDispatched: (dealId: string) => Result<AppState>;
  markReceived: (dealId: string) => Result<AppState>;
  sendMessage: (dealId: string, text: string) => Result<AppState>;
  payForDeal: (dealId: string, method: string) => Result<AppState>;
  submitVerification: (input: { gstin: string; documentName: string }) => Result<AppState>;
  simulateVerificationReview: (decision: "verified" | "rejected") => Result<AppState>;
  markNotificationsSeen: () => void;
  resetDemo: () => void;
};

type AppContextValue = Ops & {
  state: AppState;
  storageStatus: StorageStatus;
  isHydrated: boolean;
  me: Company | null;
};

const AppContext = createContext<AppContextValue | null>(null);
const NOT_READY: Result<never> = { ok: false, error: "Still loading your data. Try again in a moment." };

function makeCtx(): Ctx {
  return { newId: () => crypto.randomUUID(), now: new Date().toISOString() };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createSeedState);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  // Latest committed-or-pending state. Actions read and advance it synchronously,
  // so rapid repeated clicks are validated against each other.
  const stateRef = useRef(state);
  const isHydrated = storageStatus !== "loading";

  useEffect(() => {
    const result = loadState();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser storage on mount */
    if (result.kind === "loaded") {
      stateRef.current = result.state;
      setState(result.state);
    }
    setStorageStatus(result.kind === "loaded" || result.kind === "empty" ? "saved" : result.kind);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist only after hydration and only while storage is healthy.
  useEffect(() => {
    if (storageStatus !== "saved") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a failed external write
    if (!saveState(state)) setStorageStatus("unavailable");
  }, [state, storageStatus]);

  const commit = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** Runs a pure transition against the latest state and commits it on success. */
  const run = useCallback(
    <T,>(op: (s: AppState, ctx: Ctx) => Result<T>, nextState: (value: T) => AppState): Result<T> => {
      if (!isHydrated) return NOT_READY;
      const result = op(stateRef.current, makeCtx());
      if (result.ok) commit(nextState(result.value));
      return result;
    },
    [isHydrated, commit],
  );

  const ops = useMemo<Ops>(() => {
    const same = (s: AppState) => s;
    return {
      loginWithEmail: async (email, password) => {
        if (!isHydrated) return NOT_READY;
        const account = A.findAccount(stateRef.current, email);
        if (!account || !(await verifyPassword(password, account))) return { ok: false, error: "Email or password is incorrect." };
        return run((s) => A.loginAsCompany(s, account.companyId), same);
      },
      loginAsCompany: (id) => run((s) => A.loginAsCompany(s, id), same),
      logout: () => { if (isHydrated) commit(A.logout(stateRef.current)); },
      register: async (input) => {
        if (!isHydrated) return NOT_READY;
        if (typeof input.password !== "string" || input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
        const { salt, hash } = await hashPassword(input.password);
        return run((s, ctx) => A.register(s, { ...input, salt, passwordHash: hash }, ctx), same);
      },
      updateProfile: (input) => run((s) => A.updateProfile(s, input), same),
      addListing: (input) => {
        const r = run((s, ctx) => A.addListing(s, input, ctx), (v) => v.state);
        return r.ok ? { ok: true, value: r.value.listing } : r;
      },
      setListingStatus: (id, status) => run((s) => A.setListingStatus(s, id, status), same),
      addRequirement: (input) => {
        const r = run((s, ctx) => A.addRequirement(s, input, ctx), (v) => v.state);
        return r.ok ? { ok: true, value: r.value.requirement } : r;
      },
      setRequirementStatus: (id, status) => run((s) => A.setRequirementStatus(s, id, status), same),
      toggleSaved: (listingId) => {
        const r = run((s) => A.toggleSaved(s, listingId), (v) => v.state);
        return r.ok ? { ok: true, value: r.value.saved } : r;
      },
      requestDeal: (input) => {
        const r = run((s, ctx) => A.requestDeal(s, input, ctx), (v) => v.state);
        return r.ok ? { ok: true, value: r.value.deal } : r;
      },
      counterOffer: (id, input) => run((s, ctx) => A.counterOffer(s, id, input, ctx), same),
      acceptDeal: (id) => run((s, ctx) => A.acceptDeal(s, id, ctx), same),
      rejectDeal: (id) => run((s, ctx) => A.rejectDeal(s, id, ctx), same),
      cancelDeal: (id) => run((s, ctx) => A.cancelDeal(s, id, ctx), same),
      markDispatched: (id) => run((s, ctx) => A.markDispatched(s, id, ctx), same),
      markReceived: (id) => run((s, ctx) => A.markReceived(s, id, ctx), same),
      sendMessage: (id, text) => run((s, ctx) => A.sendMessage(s, id, text, ctx), same),
      payForDeal: (id, method) => run((s, ctx) => A.payForDeal(s, id, method, ctx), same),
      submitVerification: (input) => run((s, ctx) => A.submitVerification(s, input, ctx), same),
      simulateVerificationReview: (decision) => run((s, ctx) => A.simulateVerificationReview(s, decision, ctx), same),
      markNotificationsSeen: () => { run((s, ctx) => A.markNotificationsSeen(s, ctx), same); },
      resetDemo: () => {
        commit(createSeedState());
        // Removes only SYMBIO's key; the save effect then writes fresh seed data.
        setStorageStatus(clearState() ? "saved" : "unavailable");
      },
    };
  }, [run, commit, isHydrated]);

  const sessionId = state.session?.companyId ?? null;
  const companies = state.companies;
  const me = useMemo(() => (sessionId ? companies.find((c) => c.id === sessionId) ?? null : null), [sessionId, companies]);

  // The provider re-renders only when its own state changes, so this object is already stable between renders.
  const value: AppContextValue = { ...ops, state, storageStatus, isHydrated, me };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside <AppProvider>.");
  return context;
}
