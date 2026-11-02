"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { useApp } from "@/components/app-provider";
import { RequireAuth } from "@/components/layout/require-auth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, Notice, PageHeader } from "@/components/ui/primitives";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { CITIES } from "@/services/catalog";
import type { Role } from "@/services/types";

function ProfileForm() {
  const { me, updateProfile } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const company = me!;
  const [roles, setRoles] = useState<Role[]>(company.roles);
  const [error, setError] = useState<string | null>(null);
  const isNew = !company.description;

  const toggle = (role: Role) => setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const year = String(d.get("foundedYear") ?? "").trim();
    const r = updateProfile({
      name: d.get("name"), industry: d.get("industry"), cityId: d.get("cityId"), phone: d.get("phone"),
      description: d.get("description"), roles, foundedYear: year === "" ? Number.NaN : Number(year),
    });
    if (!r.ok) return setError(r.error);
    toast("success", "Profile saved");
    router.push(isNew ? "/dashboard" : `/companies/${company.id}`);
  }

  return (
    <Card className="mx-auto max-w-3xl p-7 sm:p-9">
      <form onSubmit={submit} noValidate onChange={() => setError(null)} className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Company name" defaultValue={company.name} maxLength={120} className="sm:col-span-2" />
        <TextField name="industry" label="Industry" defaultValue={company.industry} maxLength={120} />
        <SelectField name="cityId" label="Location" defaultValue={company.cityId}>
          {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
        </SelectField>
        <TextField name="phone" type="tel" label="Contact number" defaultValue={company.phone} />
        <TextField name="foundedYear" type="number" label="Founded" defaultValue={company.foundedYear} min={1800} max={new Date().getFullYear()} />
        <TextField label="Business email" value={company.email} readOnly disabled hint="Used to sign in; cannot be changed in the demo." className="sm:col-span-2" />
        <TextAreaField name="description" label="About your company" defaultValue={company.description} maxLength={1000} placeholder="What you make, which by-products you generate or need…" className="sm:col-span-2" />
        <fieldset className="sm:col-span-2">
          <legend className="label">Account roles</legend>
          <div className="flex flex-wrap gap-6">
            <CheckboxField label="Waste Generator (list materials)" checked={roles.includes("generator")} onChange={() => toggle("generator")} />
            <CheckboxField label="Waste Consumer (publish requirements)" checked={roles.includes("consumer")} onChange={() => toggle("consumer")} />
          </div>
        </fieldset>
        <Notice className="sm:col-span-2">Verification badges are granted by the SYMBIO team after document checks. Not available in the demo.</Notice>
        {error && <Notice tone="red" className="sm:col-span-2">{error}</Notice>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit">{isNew ? "Save and continue" : "Save profile"}</Button>
        </div>
      </form>
    </Card>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <div className="space-y-8">
        <PageHeader eyebrow="Company profile" title="Tell partners who you are" description="A complete profile builds trust with counterparties and improves your trust score." />
        <ProfileForm />
      </div>
    </RequireAuth>
  );
}
