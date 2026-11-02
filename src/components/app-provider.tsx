"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as A from "@/services/actions";
import { createSeedState } from "@/services/demoData";
import { clearState, loadState, saveState } from "@/services/storageService";
import { getSupabase } from "@/services/supabase";
import { isSupabaseConfigured } from "@/services/integrations";
import type { AppState, Company, Deal, Listing, Requirement, Result } from "@/services/types";

type AsyncResult<T> = Promise<Result<T>>;
export type StorageStatus = "loading" | "saved" | "unavailable" | "corrupt" | "unsupported";
type Ops = {
  loginWithEmail: (email: string, password: string) => AsyncResult<AppState>;
  loginAsCompany: (id: string) => AsyncResult<AppState>;
  logout: () => Promise<void>;
  register: (input: A.RegisterInput) => AsyncResult<AppState>;
  updateProfile: (input: A.ProfileInput) => AsyncResult<AppState>;
  addListing: (input: A.ListingInput) => AsyncResult<Listing>;
  setListingStatus: (id: string, status: Listing["status"]) => AsyncResult<AppState>;
  addRequirement: (input: A.RequirementInput) => AsyncResult<Requirement>;
  setRequirementStatus: (id: string, status: Requirement["status"]) => AsyncResult<AppState>;
  toggleSaved: (id: string) => AsyncResult<boolean>;
  requestDeal: (input: A.OfferInput & { listingId: string; requirementId: string | null }) => AsyncResult<Deal>;
  counterOffer: (id: string, input: A.OfferInput) => AsyncResult<AppState>;
  acceptDeal: (id: string) => AsyncResult<AppState>;
  rejectDeal: (id: string) => AsyncResult<AppState>;
  cancelDeal: (id: string) => AsyncResult<AppState>;
  markDispatched: (id: string) => AsyncResult<AppState>;
  markReceived: (id: string) => AsyncResult<AppState>;
  sendMessage: (id: string, text: string) => AsyncResult<AppState>;
  payForDeal: (id: string, method: string) => AsyncResult<AppState>;
  submitVerification: (input: { gstin: string; documentName: string }) => AsyncResult<AppState>;
  simulateVerificationReview: (decision: "verified" | "rejected") => AsyncResult<AppState>;
  markNotificationsSeen: () => void;
  resetDemo: () => void;
};
type Context = Ops & { state: AppState; storageStatus: StorageStatus; isHydrated: boolean; me: Company | null; mode: "demo" | "shared"; busy: boolean; syncError: string | null; refresh: () => Promise<void> };
const AppContext = createContext<Context | null>(null);
const emptyShared = (): AppState => ({ schemaVersion: 2, session: null, accounts: [], companies: [], listings: [], requirements: [], deals: [], savedListingIds: {} });
const fail = (error: string): Result<never> => ({ ok: false, error });
const preference = (value?: string) => { try { if (value) localStorage.setItem("symbio-mode", value); return localStorage.getItem("symbio-mode"); } catch { return null; } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createSeedState);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [mode, setMode] = useState<"demo" | "shared">("demo");
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const ref = useRef(state);
  const modeRef = useRef(mode);
  const epoch = useRef(0);
  const writing = useRef(false);
  const commit = useCallback((next: AppState) => { ref.current = next; setState(next); }, []);
  const chooseMode = useCallback((next: "demo" | "shared") => { epoch.current++; modeRef.current = next; setMode(next); preference(next); setSyncError(null); }, []);

  const sharedSnapshot = useCallback(async () => {
    const response = await fetch("/api/platform", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not sync shared data.");
    return data as { authenticated: boolean; state?: AppState };
  }, []);
  const refresh = useCallback(async () => {
    if (modeRef.current !== "shared" || writing.current) return;
    const version = epoch.current;
    try {
      const data = await sharedSnapshot();
      if (version !== epoch.current || writing.current) return;
      commit(data.state ?? emptyShared());
      setSyncError(data.authenticated ? null : "Your session ended. Sign in to your shared account again.");
    } catch (error) { if (version === epoch.current) setSyncError(error instanceof Error ? error.message : "Sync failed. Retry shortly."); }
  }, [commit, sharedSnapshot]);

  useEffect(() => {
    let alive = true;
    const local = loadState();
    const localState = local.kind === "loaded" ? local.state : createSeedState();
    const localStatus = local.kind === "loaded" || local.kind === "empty" ? "saved" : local.kind;
    async function initialize() {
      if (isSupabaseConfigured() && preference() !== "demo") {
        try {
          const data = await sharedSnapshot();
          if (!alive) return;
          if (data.authenticated && data.state) { chooseMode("shared"); commit(data.state); setStorageStatus("saved"); return; }
        } catch (error) {
          if (!alive) return;
          chooseMode("shared"); commit(emptyShared()); setStorageStatus("saved"); setSyncError(error instanceof Error ? error.message : "Shared data unavailable."); return;
        }
      }
      if (alive) { commit(localState); setStorageStatus(localStatus); }
    }
    void initialize();
    return () => { alive = false; };
  }, [chooseMode, commit, sharedSnapshot]);

  useEffect(() => {
    if (mode === "demo" && storageStatus === "saved" && !saveState(state)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external persistence failure
      setStorageStatus("unavailable");
    }
  }, [state, storageStatus, mode]);
  useEffect(() => {
    if (mode !== "shared") return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const client = getSupabase();
    const subscription = client?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { epoch.current++; commit(emptyShared()); setSyncError("Signed out. Sign in again to continue."); }
    }).data.subscription;
    return () => { clearInterval(timer); window.removeEventListener("focus", onFocus); subscription?.unsubscribe(); };
  }, [mode, refresh, commit]);

  const run = useCallback(async <T,>(action: string, input: object, id: string | undefined,
    demo: (s: AppState, ctx: A.Ctx) => Result<T>, next: (value: T) => AppState,
    remote: (s: AppState, id?: string) => T): AsyncResult<T> => {
    if (storageStatus === "loading") return fail("Still loading your data.");
    if (writing.current) return fail("Please wait for the current change to finish.");
    if (modeRef.current === "demo") {
      const result = demo(ref.current, { newId: () => crypto.randomUUID(), now: new Date().toISOString() });
      if (result.ok) commit(next(result.value));
      return result;
    }
    writing.current = true; setBusy(true); epoch.current++;
    try {
      const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, input, id }) });
      const data = await response.json();
      if (!response.ok) return fail(data.error ?? "Changes could not be saved.");
      commit(data.state); setSyncError(null);
      return { ok: true, value: remote(data.state, data.id) };
    } catch { return fail("Connection lost. Refresh before retrying to check whether the change was saved."); }
    finally { writing.current = false; setBusy(false); }
  }, [commit, storageStatus]);

  const ops = useMemo<Ops>(() => {
    const same = (s: AppState) => s;
    const change = (action: string, id: string, op: (s: AppState, c: A.Ctx) => Result<AppState>, input = {}) => run(action,input,id,op,same,same);
    return {
      loginWithEmail: async (email, password) => {
        const client = getSupabase();
        if (!client) return fail("Configure Supabase to sign into a real account, or choose a demo company below.");
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) return fail(error.message);
        chooseMode("shared");
        try { const data = await sharedSnapshot(); if (!data.state) return fail("Session not ready. Try signing in again."); commit(data.state); setStorageStatus("saved"); return { ok: true, value: data.state }; }
        catch (error) { commit(emptyShared()); setSyncError(error instanceof Error ? error.message : "Shared data unavailable."); return fail("Signed in, but the database is not ready. Apply the migration and retry."); }
      },
      loginAsCompany: async (id) => {
        if (writing.current) return fail("Wait for the current change to finish.");
        const local = loadState();
        const s = modeRef.current === "demo" ? ref.current : local.kind === "loaded" ? local.state : createSeedState();
        const result = A.loginAsCompany(s,id);
        if (result.ok) { chooseMode("demo"); commit(result.value); setStorageStatus(local.kind === "unavailable" ? "unavailable" : "saved"); }
        return result;
      },
      logout: async () => { if (writing.current) return; const client = getSupabase(); if (modeRef.current === "shared" && client) { await client.auth.signOut(); commit(emptyShared()); } else commit(A.logout(ref.current)); },
      register: async (input) => {
        const check = A.register(emptyShared(),input,{ newId: () => crypto.randomUUID(), now: new Date().toISOString() });
        if (!check.ok) return check;
        const client = getSupabase();
        if (!client) return fail("Configure Supabase before creating a real company account. The demo remains available.");
        const { password, email, ...company } = input;
        const { data, error } = await client.auth.signUp({ email: String(email).trim(), password: String(password), options: { data: company, emailRedirectTo: `${location.origin}/auth/callback` } });
        if (error) return fail(error.message);
        preference("shared");
        if (!data.session) return { ok: true, value: emptyShared() };
        chooseMode("shared");
        try { const loaded = await sharedSnapshot(); if (!loaded.state) return fail("Confirm your email, then sign in."); commit(loaded.state); return { ok: true, value: loaded.state }; }
        catch { return fail("Account created. Apply the database migration, then sign in to complete company setup."); }
      },
      updateProfile: (input) => run("updateProfile",input,undefined,(s) => A.updateProfile(s,input),same,same),
      addListing: async (input) => { const r=await run("addListing",input,undefined,(s,c)=>A.addListing(s,input,c),v=>v.state,(s,id)=>({state:s,listing:s.listings.find(l=>l.id===id)!})); return r.ok?{ok:true,value:r.value.listing}:r; },
      addRequirement: async (input) => { const r=await run("addRequirement",input,undefined,(s,c)=>A.addRequirement(s,input,c),v=>v.state,(s,id)=>({state:s,requirement:s.requirements.find(l=>l.id===id)!})); return r.ok?{ok:true,value:r.value.requirement}:r; },
      setListingStatus: (id,status)=>change("setListingStatus",id,s=>A.setListingStatus(s,id,status),{status}),
      setRequirementStatus: (id,status)=>change("setRequirementStatus",id,s=>A.setRequirementStatus(s,id,status),{status}),
      toggleSaved: async id => { const r=await run("toggleSaved",{},id,s=>A.toggleSaved(s,id),v=>v.state,s=>({state:s,saved:(s.savedListingIds[s.session!.companyId]??[]).includes(id)})); return r.ok?{ok:true,value:r.value.saved}:r; },
      requestDeal: async input => { const r=await run("requestDeal",input,undefined,(s,c)=>A.requestDeal(s,input,c),v=>v.state,(s,id)=>({state:s,deal:s.deals.find(d=>d.id===id)!})); return r.ok?{ok:true,value:r.value.deal}:r; },
      counterOffer: (id,input)=>change("counterOffer",id,(s,c)=>A.counterOffer(s,id,input,c),input),
      acceptDeal: id=>change("acceptDeal",id,(s,c)=>A.acceptDeal(s,id,c)),
      rejectDeal: id=>change("rejectDeal",id,(s,c)=>A.rejectDeal(s,id,c)),
      cancelDeal: id=>change("cancelDeal",id,(s,c)=>A.cancelDeal(s,id,c)),
      markDispatched: id=>change("markDispatched",id,(s,c)=>A.markDispatched(s,id,c)),
      markReceived: id=>change("markReceived",id,(s,c)=>A.markReceived(s,id,c)),
      sendMessage: (id,text)=>change("sendMessage",id,(s,c)=>A.sendMessage(s,id,text,c),{text}),
      payForDeal: (id,method)=>change("payForDeal",id,(s,c)=>A.payForDeal(s,id,method,c),{method}),
      submitVerification: input=>run("submitVerification",input,undefined,(s,c)=>A.submitVerification(s,input,c),same,same),
      simulateVerificationReview: decision=>run("simulateVerificationReview",{decision},undefined,(s,c)=>A.simulateVerificationReview(s,decision,c),same,same),
      markNotificationsSeen: ()=>{ void run("markNotificationsSeen",{},undefined,(s,c)=>A.markNotificationsSeen(s,c),same,same); },
      resetDemo: ()=>{ if (modeRef.current!=="demo" || writing.current) return; commit(createSeedState()); setStorageStatus(clearState()?"saved":"unavailable"); },
    };
  }, [run,commit,chooseMode,sharedSnapshot]);
  const me = state.companies.find(c=>c.id===state.session?.companyId)??null;
  return <AppContext.Provider value={{...ops,state,storageStatus,isHydrated:storageStatus!=="loading",me,mode,busy,syncError,refresh}}>{children}</AppContext.Provider>;
}
export function useApp(): Context { const value=useContext(AppContext); if (!value) throw new Error("useApp requires AppProvider"); return value; }
