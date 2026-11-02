"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/primitives";
import { fmtNumber } from "@/utils/format";

export const CHART_COLORS = ["#1e4d36", "#57a773", "#a8834a", "#7fb6a0", "#c3dfc9", "#8a6438", "#4f7f92"];

const axis = { stroke: "#9aa39b", fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = { borderRadius: 12, border: "1px solid #e3dfd1", boxShadow: "0 10px 30px -14px rgb(22 58 41 / 0.25)", fontSize: 13 };

export function ChartCard({ title, subtitle, children, action, className }: { title: string; subtitle?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <Card className={`relative isolate min-w-0 p-6 ${className ?? ""}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] leading-tight text-forest-950">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** Monthly bars (kg) with an accessible text summary. */
export function MonthlyBars({ data, dataKey = "kg", unit = "kg" }: { data: { month: string; [k: string]: number | string }[]; dataKey?: string; unit?: string }) {
  const summary = data.map((d) => `${d.month}: ${fmtNumber(Number(d[dataKey]))} ${unit}`).join(", ");
  return (
    <figure className="relative isolate min-w-0 overflow-hidden">
      <div className="h-64 min-w-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#ece8dc" />
            <XAxis dataKey="month" {...axis} />
            <YAxis {...axis} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
            <Tooltip cursor={{ fill: "#e9f2ea" }} contentStyle={tooltipStyle} formatter={(v) => [`${fmtNumber(Number(v))} ${unit}`, ""]} />
            <Bar dataKey={dataKey} fill="#1e4d36" radius={[8, 8, 2, 2]} maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

export function TrendArea({ data, dataKey, unit }: { data: { month: string; [k: string]: number | string }[]; dataKey: string; unit: string }) {
  const summary = data.map((d) => `${d.month}: ${fmtNumber(Number(d[dataKey]))} ${unit}`).join(", ");
  return (
    <figure className="relative isolate min-w-0 overflow-hidden">
      <div className="h-64 min-w-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={`area-${dataKey}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#57a773" stopOpacity={0.45} />
                <stop offset="1" stopColor="#57a773" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#ece8dc" />
            <XAxis dataKey="month" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${fmtNumber(Number(v))} ${unit}`, ""]} />
            <Area type="monotone" dataKey={dataKey} stroke="#2f7a52" strokeWidth={2.5} fill={`url(#area-${dataKey})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/** Donut with a legend that doubles as the accessible description. */
export function Donut({ data, unit = "kg" }: { data: { label: string; value: number }[]; unit?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-5">
      <div className="relative isolate mx-auto size-[180px] shrink-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${fmtNumber(Number(v))} ${unit}`, ""]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="font-display text-[26px] leading-none text-forest-950">{fmtNumber(total)}</p><p className="text-[11px] text-muted">{unit} total</p></div>
        </div>
      </div>
      <ul className="min-w-0 flex-[1_1_160px] space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-[13px]">
            <span className="flex min-w-0 items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{d.label}</span>
            <span className="tabular-nums font-semibold">{fmtNumber(d.value)} {unit} <span className="font-normal text-muted">({total ? Math.round((d.value / total) * 100) : 0}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
