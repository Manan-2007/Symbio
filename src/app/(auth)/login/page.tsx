"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { cityName } from "@/services/catalog";
import { isEmail } from "@/services/validation";

export default function LoginPage() {
  const { state, loginWithEmail, loginAsCompany, isHydrated } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (!isEmail(email)) return setError("Enter a valid business email.");
    if (!password) return setError("Enter your password.");
    const r = loginWithEmail(email);
    if (!r.ok) return setError(r.error);
    toast("success", "Welcome back", "Signed in to your demo account.");
    router.push("/dashboard");
  }

  const demoCompanies = state.companies.filter((c) => c.isDemo).slice(0, 6);

  return (
    <div>
      <h1 className="font-display text-[42px] leading-none font-medium text-forest-950">Welcome back</h1>
      <p className="mt-3 text-[15px] text-muted">Sign in to manage listings, matches and exchanges.</p>
      <Notice className="mt-6">Demo mode: passwords are not stored or verified. Any password works for an existing demo or registered email.</Notice>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <TextField name="email" type="email" label="Business email" autoComplete="email" placeholder="you@company.com" onChange={() => setError(null)} />
        <TextField name="password" type="password" label="Password" autoComplete="current-password" onChange={() => setError(null)} />
        <div className="flex justify-end"><Link href="/forgot-password" className="text-[13px] font-semibold text-emerald hover:underline">Forgot password?</Link></div>
        {error && <p role="alert" className="text-[13px] font-medium text-error">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={!isHydrated} iconRight={<ArrowRight className="size-4" />}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">New to SYMBIO? <Link href="/register" className="font-semibold text-forest hover:underline">Create a company account</Link></p>

      <div className="mt-10">
        <p className="text-center text-[11.5px] font-bold tracking-[0.14em] text-muted uppercase">Or explore as a demo company</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {demoCompanies.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={!isHydrated}
                onClick={() => { const r = loginAsCompany(c.id); if (r.ok) { toast("success", `Signed in as ${c.name}`, "Demo account, no password needed."); router.push("/dashboard"); } }}
                className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left transition-colors hover:border-forest disabled:opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-50 font-display text-lg font-semibold text-forest">{c.name.charAt(0)}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate text-[13px] font-semibold">{c.name}{c.verified && <ShieldCheck className="size-3.5 shrink-0 text-emerald" aria-label="Verified" />}</span>
                  <span className="block truncate text-[12px] text-muted">{c.roles.map((r) => (r === "generator" ? "Generator" : "Consumer")).join(" & ")} · {cityName(c.cityId)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
