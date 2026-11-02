import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/utils/format";

type FieldProps = { label: string; hint?: ReactNode; error?: string; className?: string };

function useFieldIds(error?: string, hint?: ReactNode) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return { id, describedBy };
}

function Footer({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {hint && !error && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-[12.5px] font-medium text-error">{error}</p>}
    </>
  );
}

export function TextField({ label, hint, error, className, ...props }: FieldProps & ComponentProps<"input">) {
  const { id, describedBy } = useFieldIds(error, hint);
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      <Footer id={id} hint={hint} error={error} />
    </div>
  );
}

export function SelectField({ label, hint, error, className, children, ...props }: FieldProps & ComponentProps<"select">) {
  const { id, describedBy } = useFieldIds(error, hint);
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <select id={id} className="input appearance-none pr-10" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      <Footer id={id} hint={hint} error={error} />
    </div>
  );
}

export function TextAreaField({ label, hint, error, className, ...props }: FieldProps & ComponentProps<"textarea">) {
  const { id, describedBy } = useFieldIds(error, hint);
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <textarea id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      <Footer id={id} hint={hint} error={error} />
    </div>
  );
}

export function CheckboxField({ label, className, ...props }: { label: ReactNode; className?: string } & ComponentProps<"input">) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-3 text-sm leading-snug", className)}>
      <input type="checkbox" className="mt-0.5 size-[18px] shrink-0 accent-forest" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** Pill-style radio group for short enumerations. */
export function ChoiceGroup<T extends string>({ label, name, value, options, onChange }: {
  label: string; name: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={cx(
            "cursor-pointer rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald",
            value === o.value ? "border-forest bg-forest text-white" : "border-line-strong bg-white text-ink hover:border-forest",
          )}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
