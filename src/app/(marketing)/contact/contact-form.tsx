"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { Card, Notice } from "@/components/ui/primitives";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { isEmail } from "@/services/validation";
import { saveContactMessage } from "@/services/storageService";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

export function ContactForm() {
  const { toast } = useToast();
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<null | "stored" | "local">(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const next: Errors = {};
    if (name.length < 2) next.name = "Enter your name.";
    if (!isEmail(email)) next.email = "Enter a valid email address.";
    if (message.length < 10) next.message = "Write at least a sentence so we can help.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const stored = saveContactMessage({ name, email, message, company: String(data.get("company") ?? "").trim(), topic: String(data.get("topic") ?? "other") });
    setBusy(false);
    form.reset();
    setSent(stored ? "stored" : "local");
    toast("success", "Message saved", stored ? "Stored in this browser (demo build)." : "Browser storage is unavailable, so nothing was kept.");
  }

  return (
    <Card className="p-7 sm:p-9">
      <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Your name" autoComplete="name" error={errors.name} />
        <TextField name="email" type="email" label="Work email" autoComplete="email" error={errors.email} />
        <TextField name="company" label="Company (optional)" autoComplete="organization" className="sm:col-span-2" />
        <SelectField name="topic" label="Topic" defaultValue="listing" className="sm:col-span-2">
          <option value="listing">Listing materials</option>
          <option value="sourcing">Sourcing materials</option>
          <option value="pilot">Cluster pilot</option>
          <option value="other">Something else</option>
        </SelectField>
        <TextAreaField name="message" label="Message" error={errors.message} className="sm:col-span-2" maxLength={1000} />
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Button type="submit" disabled={busy} icon={<Send className="size-4" />}>{busy ? "Sending…" : "Send message"}</Button>
          <p className="text-[12.5px] text-muted">Demo build: messages are saved in this browser only.</p>
        </div>
        {sent && <Notice tone="green" className="sm:col-span-2">{sent === "stored" ? "Thanks! Your message is saved in this browser. In a live deployment it would reach the SYMBIO team." : "Thanks! Browser storage is unavailable, so nothing was kept."}</Notice>}
      </form>
    </Card>
  );
}
