"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { isEmail } from "@/services/validation";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!isEmail(email)) return setError("Enter a valid business email.");
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-sage-50 text-forest"><MailCheck className="size-6" /></div>
        <h1 className="mt-6 font-display text-[38px] leading-none text-forest-950">Check your inbox</h1>
        <p className="mt-3 text-[15px] text-muted">In a live deployment, a reset link would be sent to <strong className="text-ink">{sentTo}</strong>.</p>
        <Notice className="mt-6 text-left">Demo mode: no email was sent. Demo accounts don&apos;t need a password; sign in with any password.</Notice>
        <Link href="/login" className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest hover:underline"><ArrowLeft className="size-4" /> Back to sign in</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[42px] leading-none font-medium text-forest-950">Reset your password</h1>
      <p className="mt-3 text-[15px] text-muted">Enter your business email and we&apos;ll send reset instructions.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <TextField name="email" type="email" label="Business email" autoComplete="email" error={error ?? undefined} onChange={() => setError(null)} />
        <Button type="submit" size="lg" className="w-full">Send reset link</Button>
      </form>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest hover:underline"><ArrowLeft className="size-4" /> Back to sign in</Link>
    </div>
  );
}
