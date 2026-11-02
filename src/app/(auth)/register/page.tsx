"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/ui/toast";
import { ChoiceGroup, SelectField, TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { CITIES } from "@/services/catalog";
import type { Role } from "@/services/types";

const ROLE_OPTIONS = [
  { value: "generator", label: "Waste Generator" },
  { value: "consumer", label: "Waste Consumer" },
  { value: "both", label: "Both" },
] as const;

export default function RegisterPage() {
  const { register, isHydrated } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]["value"]>("generator");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("password") !== data.get("confirm")) return setError("Passwords don't match.");
    const roles: Role[] = role === "both" ? ["generator", "consumer"] : [role];
    const r = await register({
      companyName: data.get("companyName"), email: data.get("email"), password: data.get("password"), industry: data.get("industry"),
      cityId: data.get("cityId"), phone: data.get("phone"), roles,
    });
    if (!r.ok) return setError(r.error);
    toast("success", r.value.session ? "Company account created" : "Check your email", r.value.session ? "Now complete your profile." : "Confirm your email address, then sign in.");
    router.push(r.value.session ? "/onboarding" : "/login");
  }

  return (
    <div>
      <h1 className="font-display text-[42px] leading-none font-medium text-forest-950">Create your company account</h1>
      <p className="mt-3 text-[15px] text-muted">List by-products, publish requirements and get matched.</p>
      <form onSubmit={submit} noValidate onChange={() => setError(null)} className="mt-7 space-y-4">
        <TextField name="companyName" label="Company name" autoComplete="organization" required maxLength={120} />
        <TextField name="email" type="email" label="Business email" autoComplete="email" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="password" type="password" label="Password" autoComplete="new-password" hint="At least 8 characters" required minLength={8} />
          <TextField name="confirm" type="password" label="Confirm password" autoComplete="new-password" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="industry" label="Industry" placeholder="e.g. Furniture" required maxLength={120} />
          <SelectField name="cityId" label="Location" defaultValue="" required>
            <option value="" disabled>Choose a city</option>
            {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
          </SelectField>
        </div>
        <TextField name="phone" type="tel" label="Contact number" autoComplete="tel" placeholder="+91 98765 43210" required />
        <ChoiceGroup label="Account role" name="role" value={role} options={ROLE_OPTIONS} onChange={setRole} />
        {error && <p role="alert" className="text-[13px] font-medium text-error">{error}</p>}
        <Notice>Your account is secured by Supabase. Confirm your email to activate your company workspace.</Notice>
        <Button type="submit" className="w-full" size="lg" disabled={!isHydrated} iconRight={<ArrowRight className="size-4" />}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">Already registered? <Link href="/login" className="font-semibold text-forest hover:underline">Sign in</Link></p>
    </div>
  );
}
