const IN = "en-IN";

export const fmtNumber = (n: number, digits = 0) => n.toLocaleString(IN, { maximumFractionDigits: digits });
export const fmtKg = (kg: number) => (kg >= 1000 ? `${fmtNumber(kg / 1000, 2)} t` : `${fmtNumber(kg, 1)} kg`);
export const fmtInr = (n: number) => `₹${n.toLocaleString(IN, { maximumFractionDigits: 2 })}`;
export const fmtPricePerKg = (n: number) => (n === 0 ? "Free" : `${fmtInr(n)}/kg`);
export const fmtCo2e = (kg: number) => (kg >= 1000 ? `${fmtNumber(kg / 1000, 2)} tCO₂e` : `${fmtNumber(kg, 0)} kgCO₂e`);
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(IN, { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(IN, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const shortId = (id: string) => id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
