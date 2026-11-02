import Link from "next/link";
import { Logo } from "@/components/ui/visuals";
import { HeroGlobe } from "@/components/home/hero-globe";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="focus-ring w-fit rounded-full" aria-label="SYMBIO home"><Logo /></Link>
        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">{children}</main>
        <p className="text-center text-[12px] text-muted">Demo mode · accounts are simulated and stored only in this browser.</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-forest-950 lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_60%_30%,#2f7a52_0%,#163a29_55%,#0f261b_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <p className="font-display text-[44px] leading-[1.05]">One Industry&apos;s Waste.<br /><em className="text-sage italic">Another Industry&apos;s Wealth.</em></p>
          <HeroGlobe className="mx-auto w-full max-w-[460px]" />
          <p className="max-w-sm text-[14px] text-sage/80">Join manufacturers, recyclers and growers turning by-products into raw materials.</p>
        </div>
      </aside>
    </div>
  );
}
