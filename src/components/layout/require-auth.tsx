"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Card, LoadingBlock } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const QUICK = [
  { id: "co-freshgrow", label: "FreshGrow (buyer)" },
  { id: "co-green-furniture", label: "Green Furniture (seller)" },
  { id: "co-organic-earth", label: "Organic Earth (both)" },
];

/** Renders children only for a signed-in demo company; otherwise a sign-in prompt. */
export function RequireAuth({ children, title = "Sign in to continue" }: { children: ReactNode; title?: string }) {
  const { isHydrated, me, loginAsCompany, state } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  if (!isHydrated) return <LoadingBlock />;
  if (me) return <>{children}</>;
  return (
    <Card className="mx-auto max-w-xl p-8 text-center sm:p-10">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-sage-50 text-forest"><Lock className="size-5" /></div>
      <h1 className="font-display text-3xl text-forest-950">{title}</h1>
      <p className="mt-2 text-sm text-muted">This area belongs to a company account. Sign in, register, or explore instantly as a fictional demo company.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/login">Sign in</ButtonLink>
        <ButtonLink href="/register" variant="secondary">Register</ButtonLink>
      </div>
      <p className="mt-8 text-[12px] font-bold tracking-[0.14em] text-muted uppercase">Or continue as a demo company</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {QUICK.filter((q) => state.companies.some((c) => c.id === q.id)).map((q) => (
          <Button key={q.id} size="sm" variant="secondary" onClick={() => { const r = loginAsCompany(q.id); if (r.ok) { toast("success", `Signed in as ${q.label.split(" (")[0]}`, "Demo account, no password needed."); router.refresh(); } }}>
            {q.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
