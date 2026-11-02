"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/ui/visuals";
import { ButtonLink } from "@/components/ui/button";
import { useApp } from "@/components/app-provider";
import { cx } from "@/utils/format";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/impact", label: "Impact" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const { me, isHydrated } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signedIn = isHydrated && me;

  return (
    <header className={cx("sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300", scrolled || open ? "border-b border-line/80 bg-ivory/85 backdrop-blur-md" : "border-b border-transparent")}>
      <nav aria-label="Main" className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="focus-ring rounded-full" aria-label="SYMBIO home"><Logo /></Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link href={l.href} aria-current={active ? "page" : undefined} className={cx("focus-ring rounded-full px-4 py-2 text-[14px] font-medium transition-colors", active ? "text-forest" : "text-ink/75 hover:text-forest")}>
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm">Open dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">Login</ButtonLink>
              <ButtonLink href="/register" size="sm">Get Started</ButtonLink>
            </>
          )}
        </div>
        <button type="button" className="focus-ring rounded-full p-2 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div id="mobile-nav" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
            <ul className="flex flex-col gap-1 px-5 pb-5">
              {LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-[15px] font-medium hover:bg-sage-50">{l.label}</Link></li>
              ))}
              <li className="mt-2 flex gap-2">
                {signedIn ? (
                  <ButtonLink href="/dashboard" className="flex-1" onClick={() => setOpen(false)}>Open dashboard</ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/login" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Login</ButtonLink>
                    <ButtonLink href="/register" className="flex-1" onClick={() => setOpen(false)}>Get Started</ButtonLink>
                  </>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
