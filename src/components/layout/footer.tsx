import Link from "next/link";
import { Logo } from "@/components/ui/visuals";

const COLUMNS = [
  { title: "Platform", links: [["Marketplace", "/marketplace"], ["Smart matches", "/matches"], ["Carbon impact", "/impact"], ["Waste classifier", "/classifier"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Get started", "/register"], ["Login", "/login"]] },
  { title: "Resources", links: [["How matching works", "/#how-it-works"], ["Material categories", "/#categories"], ["Original prototype", "/prototype"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 bg-forest-950 text-sage">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs font-display text-[22px] leading-snug text-white/90">One Industry&apos;s Waste. Another Industry&apos;s Wealth.</p>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-sage/70">
            A demonstration platform. Companies, listings, testimonials and impact figures shown are fictional, and all data stays in your browser.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-[12px] font-bold tracking-[0.14em] text-white/60 uppercase">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="focus-ring rounded text-[14px] text-sage/85 transition-colors hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-6 text-[12px] text-sage/60 sm:flex-row sm:justify-between sm:px-8">
          <p>© 2026 SYMBIO · Demo build</p>
          <p>Carbon figures are illustrative estimates, not certified offsets.</p>
        </div>
      </div>
    </footer>
  );
}
