import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/utils/format";

type Variant = "primary" | "secondary" | "ghost" | "light" | "outline-light" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform,box-shadow] duration-200 focus-ring disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-white hover:bg-forest-900 shadow-[0_8px_20px_-10px_rgb(22_58_41/0.6)]",
  secondary: "border border-line-strong bg-white text-ink hover:border-forest hover:text-forest",
  ghost: "text-ink hover:bg-sage-50",
  light: "bg-white text-forest-900 hover:bg-ivory",
  "outline-light": "border border-white/60 text-white hover:bg-white/10",
  danger: "bg-error text-white hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

type Common = { variant?: Variant; size?: Size; icon?: ReactNode; iconRight?: ReactNode };

export function Button({ variant, size, icon, iconRight, className, children, type = "button", ...props }: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, iconRight, className, children, ...props }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
