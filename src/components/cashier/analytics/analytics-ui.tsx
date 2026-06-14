"use client";
import type { ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
export function AnalyticsLoading() {
    return (<div className="flex flex-1 items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-red-600"/>
    </div>);
}
export function AnalyticsHeader({ subtitle, onRefresh, refreshing, }: {
    subtitle: string;
    onRefresh?: () => void;
    refreshing?: boolean;
}) {
    return (<div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 pb-4">
      <p className="text-sm text-neutral-500">{subtitle}</p>
      {onRefresh && (<Button type="button" variant="outline" size="sm" className="h-9 gap-2 rounded-lg bg-white shadow-sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<RefreshCw className="h-4 w-4"/>)}
          Refresh
        </Button>)}
    </div>);
}
export function StatCard({ label, value, hint, accent = "red", }: {
    label: string;
    value: string;
    hint?: string;
    accent?: "red" | "green" | "neutral";
}) {
    const valueColor = accent === "green"
        ? "text-green-700"
        : accent === "red"
            ? "text-[#E31837]"
            : "text-neutral-900";
    return (<div className="border border-neutral-200 bg-white px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", valueColor)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>);
}
export function StatGrid({ children }: {
    children: ReactNode;
}) {
    return (<div className="grid gap-3 sm:grid-cols-2">{children}</div>);
}
export interface CompactMetric {
    label: string;
    value: string;
    sub?: string;
    tone?: "red" | "green" | "neutral";
}
export function CompactStatStrip({ metrics }: {
    metrics: CompactMetric[];
}) {
    return (<div className="grid grid-cols-2 divide-x divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white sm:grid-cols-4 sm:divide-y-0">
      {metrics.map((m) => (<div key={m.label} className="min-w-0 px-3 py-2.5 sm:px-4">
          <p className="truncate text-[11px] font-medium text-neutral-500">
            {m.label}
          </p>
          <p className={cn("mt-0.5 truncate text-lg font-bold leading-tight tabular-nums", m.tone === "green"
                ? "text-green-700"
                : m.tone === "red"
                    ? "text-[#E31837]"
                    : "text-neutral-900")}>
            {m.value}
          </p>
          {m.sub && (<p className="truncate text-[10px] text-neutral-400">{m.sub}</p>)}
        </div>))}
    </div>);
}
export function SectionTitle({ children, count, }: {
    children: ReactNode;
    count?: number;
}) {
    return (<div className="flex items-baseline justify-between gap-2 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {children}
      </p>
      {count !== undefined && (<span className="text-xs tabular-nums text-neutral-400">{count}</span>)}
    </div>);
}
export function RevenuePanel({ title, gross, refunds, net, }: {
    title: string;
    gross: number;
    refunds: number;
    net: number;
}) {
    const grossSafe = Math.max(gross, 0.01);
    const refundPct = Math.min(100, (refunds / grossSafe) * 100);
    return (<div className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-2.5">
        <p className="text-xs font-semibold text-neutral-500">{title}</p>
        <p className="text-2xl font-bold tabular-nums text-[#E31837]">
          {formatMoney(net)}
        </p>
        <p className="text-[10px] text-neutral-400">Net after refunds</p>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>Gross</span>
          <span className="font-medium tabular-nums">{formatMoney(gross)}</span>
        </div>
        <div className="flex justify-between text-green-700">
          <span>Refunds</span>
          <span className="font-medium tabular-nums">−{formatMoney(refunds)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-green-500/80" style={{ width: `${refundPct}%` }}/>
        </div>
        <p className="text-[10px] text-neutral-400">
          Refunds are {refundPct.toFixed(0)}% of gross
        </p>
      </div>
    </div>);
}
export function WeekBarChart({ days, }: {
    days: {
        label: string;
        sales: number;
        bills: number;
    }[];
}) {
    const max = Math.max(...days.map((d) => d.sales), 1);
    return (<div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold text-neutral-500">Last 7 days</p>
      <div className="mt-6 flex items-end justify-between gap-2">
        {days.map((d) => {
            const h = Math.max(8, (d.sales / max) * 120);
            return (<div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-semibold tabular-nums text-neutral-500">
                {d.bills}
              </span>
              <div className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-red-700 to-red-500" style={{ height: `${h}px` }} title={`${formatMoney(d.sales)} · ${d.bills} bills`}/>
              <span className="truncate text-[10px] font-medium text-neutral-600">
                {d.label}
              </span>
            </div>);
        })}
      </div>
    </div>);
}
export function TopProductsList({ products, }: {
    products: {
        name: string;
        quantity: number;
        revenue: number;
    }[];
}) {
    if (products.length === 0) {
        return (<p className="py-8 text-center text-sm text-neutral-500">
        No product sales this week
      </p>);
    }
    const max = Math.max(...products.map((p) => p.revenue), 1);
    return (<ul className="divide-y divide-neutral-100">
      {products.map((p, i) => (<li key={p.name} className="flex items-center gap-3 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-600">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-neutral-900">{p.name}</p>
            <p className="text-xs text-neutral-500">{p.quantity} sold</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${(p.revenue / max) * 100}%` }}/>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums text-[#E31837]">
            {formatMoney(p.revenue)}
          </span>
        </li>))}
    </ul>);
}

