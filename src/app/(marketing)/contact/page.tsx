import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-[1240px] gap-12 px-5 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 font-display text-[48px] leading-[1.02] font-medium text-forest-950 sm:text-[60px]">Let&apos;s close a loop together.</h1>
        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted">Questions about listing materials, onboarding your plant, or piloting SYMBIO in your industrial cluster? Send a note.</p>
        <dl className="mt-10 space-y-5 text-[14px]">
          <div><dt className="font-semibold">Pilot regions</dt><dd className="text-muted">Punjab, Chandigarh tricity, Haryana and Delhi NCR (demo)</dd></div>
          <div><dt className="font-semibold">Response time</dt><dd className="text-muted">Usually within two working days.</dd></div>
        </dl>
      </div>
      <ContactForm />
    </div>
  );
}
