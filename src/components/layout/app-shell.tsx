"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Building2, ClipboardList, Handshake, LayoutDashboard, Leaf, LogIn, LogOut, Map, Menu, PlugZap, Scale, PlusCircle, Receipt, RotateCcw, ScanSearch, Settings, Sparkles, Store, X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/app-provider";
import { Logo } from "@/components/ui/visuals";
import { ButtonLink, Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Notice } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cityName } from "@/services/catalog";
import { SymbioAssistant } from "@/components/assistant";
import { NotificationBell } from "@/components/notification-bell";
import { cx } from "@/utils/format";

type Item = { href: string; label: string; icon: typeof Store; auth?: boolean };

const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true }] },
  {
    title: "Trade",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: Store },
      { href: "/listings/new", label: "Add listing", icon: PlusCircle, auth: true },
      { href: "/requirements", label: "Requirements", icon: ClipboardList, auth: true },
    ],
  },
  {
    title: "Matching",
    items: [
      { href: "/matches", label: "Smart matches", icon: Sparkles, auth: true },
      { href: "/negotiations", label: "Negotiations", icon: Handshake, auth: true },
      { href: "/barter", label: "Barter estimator", icon: Scale },
      { href: "/map", label: "Map", icon: Map },
    ],
  },
  {
    title: "Impact",
    items: [
      { href: "/impact", label: "Carbon impact", icon: Leaf },
      { href: "/transactions", label: "Transactions", icon: Receipt, auth: true },
      { href: "/classifier", label: "Waste classifier", icon: ScanSearch },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, logout, resetDemo } = useApp();
  const { toast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const linkClass = (active: boolean) =>
    cx("focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors", active ? "bg-forest text-white" : "text-ink/80 hover:bg-sage-50 hover:text-forest");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-5 pt-6 pb-5">
        <Link href="/" onClick={onNavigate} className="focus-ring rounded-full" aria-label="SYMBIO home"><Logo /></Link>
      </div>
      <nav aria-label="App" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-bold tracking-[0.14em] text-muted/80 uppercase">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.filter((i) => !i.auth || me).map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                      <Icon className="size-[18px] shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {me && (
          <div className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-bold tracking-[0.14em] text-muted/80 uppercase">Account</p>
            <ul className="space-y-0.5">
              <li><Link href={`/companies/${me.id}`} onClick={onNavigate} className={linkClass(pathname === `/companies/${me.id}`)}><Building2 className="size-[18px]" aria-hidden />Company profile</Link></li>
              <li><Link href="/onboarding" onClick={onNavigate} className={linkClass(pathname === "/onboarding")}><Settings className="size-[18px]" aria-hidden />Profile settings</Link></li>
              <li><Link href="/integrations" onClick={onNavigate} className={linkClass(pathname === "/integrations")}><PlugZap className="size-[18px]" aria-hidden />Integrations</Link></li>
            </ul>
          </div>
        )}
      </nav>
      <div className="shrink-0 border-t border-line bg-[#fbfaf5] p-4">
        <div className="mb-3 hidden lg:block"><SymbioAssistant inline /></div>
        {me ? (
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-sage font-display text-lg font-semibold text-forest-900">{me.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{me.name}</p>
              <p className="truncate text-[12px] text-muted">{me.industry} · {cityName(me.cityId, me.location)}</p>
            </div>
            <button type="button" onClick={() => { logout(); toast("info", "Signed out"); router.push("/"); onNavigate?.(); }} className="focus-ring rounded-full p-2 text-muted hover:bg-mist hover:text-ink" aria-label="Sign out">
              <LogOut className="size-[18px]" />
            </button>
          </div>
        ) : (
          <ButtonLink href="/login" className="w-full" icon={<LogIn className="size-4" />} onClick={onNavigate}>Sign in</ButtonLink>
        )}
        <button type="button" onClick={() => setConfirmReset(true)} className="focus-ring mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-medium text-muted hover:text-ink">
          <RotateCcw className="size-3.5" aria-hidden /> Reset demo data
        </button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { resetDemo(); setConfirmReset(false); toast("success", "Demo data restored", "Only SYMBIO's saved data was cleared."); router.push("/"); onNavigate?.(); }}
        title="Reset demo data?"
        body="This discards your registered companies, listings, requirements and negotiations in this browser and restores the sample data. It does not affect other sites."
        confirmLabel="Reset"
        danger
      />
    </div>
  );
}

/** Static stand-in while the pathname-aware sidebar resolves on dynamic routes. */
function SidebarFallback() {
  return (
    <div className="px-5 pt-6"><Logo /></div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <SidebarContent onNavigate={onNavigate} />
    </Suspense>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { storageStatus, resetDemo } = useApp();
  const [drawer, setDrawer] = useState(false);

  // Lock body scroll while the mobile drawer is open (links close it via onNavigate).
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 hidden h-dvh self-start border-r border-line bg-[#fbfaf5] lg:block"><Sidebar /></aside>

      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ivory px-4 lg:hidden">
        <Link href="/" aria-label="SYMBIO home" className="focus-ring rounded-full"><Logo /></Link>
        <div className="flex items-center gap-2">
          <SymbioAssistant inline />
          <NotificationBell />
          <button type="button" onClick={() => setDrawer(true)} className="focus-ring rounded-full p-2" aria-label="Open navigation" aria-expanded={drawer}>
            <Menu className="size-6" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div key="scrim" className="fixed inset-0 z-40 bg-forest-950/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside key="drawer" role="dialog" aria-modal="true" aria-label="Navigation" className="fixed inset-y-0 left-0 z-50 w-[290px] bg-[#fbfaf5] shadow-lift lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "tween", duration: 0.22 }}>
              <button type="button" onClick={() => setDrawer(false)} className="focus-ring absolute top-5 right-4 rounded-full p-2" aria-label="Close navigation"><X className="size-5" /></button>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="relative isolate z-0 min-w-0">
        <div className="border-b border-[#ecdfbd] bg-notice px-5 py-2 text-center text-[12.5px] font-medium text-notice-text">
          Demo · Fictional companies · {storageStatus === "unavailable" ? "Changes cannot be saved in this browser" : storageStatus === "corrupt" || storageStatus === "unsupported" ? "Saving paused" : "Data saved in this browser"}
        </div>
        <div className="mx-auto hidden max-w-[1180px] justify-end px-8 pt-5 lg:flex"><NotificationBell /></div>
        <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 pb-24 lg:pt-2 lg:pb-24">
          {(storageStatus === "corrupt" || storageStatus === "unsupported") && (
            <Notice tone="red" className="mb-6">
              Saved SYMBIO data in this browser could not be read, so it was left untouched and sample data is shown without saving.{" "}
              <Button size="sm" variant="secondary" className="ml-2" onClick={resetDemo}>Reset and start saving</Button>
            </Notice>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
