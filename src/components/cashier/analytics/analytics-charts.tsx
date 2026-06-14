"use client";
import type { ChartPoint } from "@/lib/analytics/cashier-analytics";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
export type SalesPeriod = "day" | "week" | "month" | "year";
const PERIOD_LABELS: Record<SalesPeriod, string> = {
    day: "Day",
    week: "Week",
    month: "Month",
    year: "Year",
};
export function PeriodSelector({ value, onChange, }: {
    value: SalesPeriod;
    onChange: (p: SalesPeriod) => void;
}) {
    return (<div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
      {(Object.keys(PERIOD_LABELS) as SalesPeriod[]).map((p) => (<button key={p} type="button" onClick={() => onChange(p)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", value === p
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800")}>
          {PERIOD_LABELS[p]}
        </button>))}
    </div>);
}
export function SalesBarChart({ days, compact, }: {
    days: ChartPoint[];
    compact?: boolean;
}) {
    const maxSales = Math.max(...days.map((d) => d.sales), 1);
    const peak = days.reduce((best, d) => (d.sales > best.sales ? d : best), days[0] ?? { sales: 0, label: "" });
    if (days.every((d) => d.sales === 0 && d.bills === 0)) {
        return (<p className="py-12 text-center text-sm text-neutral-400">
        No sales in this period
      </p>);
    }
    const barMax = compact ? 100 : 120;
    return (<div className={cn("flex items-end justify-between gap-1", compact ? "h-28" : "h-36")}>
      {days.map((d) => {
            const barPx = Math.max(4, (d.sales / maxSales) * barMax);
            const isPeak = d.label === peak.label && d.sales > 0;
            return (<div key={d.date + d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${formatMoney(d.sales)} · ${d.bills} bills`}>
            {d.sales > 0 && !compact && (<span className={cn("max-w-full truncate text-[9px] tabular-nums", isPeak ? "font-semibold text-neutral-800" : "text-neutral-400")}>
                {d.sales >= 1000
                        ? `${(d.sales / 1000).toFixed(1)}k`
                        : Math.round(d.sales)}
              </span>)}
            <div className={cn("w-full max-w-[32px] rounded-sm", isPeak ? "bg-neutral-800" : "bg-neutral-200")} style={{ height: barPx }}/>
            <span className="max-w-full truncate text-[9px] text-neutral-500">
              {d.label}
            </span>
          </div>);
        })}
    </div>);
}
export function SalesDonutChart({ segments, centerLabel, centerValue, }: {
    segments: {
        label: string;
        value: number;
        color: string;
    }[];
    centerLabel: string;
    centerValue: string;
}) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const r = 52;
    const c = 2 * Math.PI * r;
    let offset = 0;
    if (total <= 0) {
        return (<div className="flex h-[200px] flex-col items-center justify-center text-sm text-neutral-400">
        No sales data
      </div>);
    }
    return (<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#f5f5f5" strokeWidth="14"/>
          {segments.map((seg) => {
            const len = (seg.value / total) * c;
            const el = (<circle key={seg.label} cx="70" cy="70" r={r} fill="none" stroke={seg.color} strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="round"/>);
            offset += len;
            return el;
        })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] text-neutral-500">{centerLabel}</p>
          <p className="text-sm font-bold tabular-nums text-neutral-900">
            {centerValue}
          </p>
        </div>
      </div>
      <ul className="w-full min-w-[200px] flex-1 space-y-2.5 text-sm sm:min-w-[220px]">
        {segments.map((seg) => (<li key={seg.label} className="flex items-start gap-2.5">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }}/>
            <span className="min-w-0 flex-1 leading-snug text-neutral-600">
              {seg.label}
            </span>
            <span className="shrink-0 pt-px text-right text-xs font-semibold tabular-nums text-neutral-900 sm:text-sm">
              {formatMoney(seg.value)}
            </span>
          </li>))}
      </ul>
    </div>);
}
const STOCK_DONUT = {
    default: { size: 168, cx: 84, r: 58, stroke: 20 },
    compact: { size: 120, cx: 60, r: 42, stroke: 16 },
} as const;
export function StockDonutChart({ segments, centerLabel, centerValue, onSegmentClick, compact, }: {
    segments: {
        key: string;
        label: string;
        value: number;
        color: string;
    }[];
    centerLabel: string;
    centerValue: string;
    onSegmentClick?: (key: string) => void;
    compact?: boolean;
}) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const { size, cx, r, stroke } = compact
        ? STOCK_DONUT.compact
        : STOCK_DONUT.default;
    const c = 2 * Math.PI * r;
    let offset = 0;
    if (total <= 0) {
        return (<div className="flex flex-col items-center justify-center text-sm text-neutral-400" style={{ width: size, height: size }}>
        No stock data
      </div>);
    }
    return (<div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f5f5f5" strokeWidth={stroke}/>
        {segments.map((seg) => {
            if (seg.value <= 0)
                return null;
            const len = (seg.value / total) * c;
            const el = (<circle key={seg.key} cx={cx} cy={cx} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="round" className={onSegmentClick ? "cursor-pointer" : undefined} role={onSegmentClick ? "button" : undefined} tabIndex={onSegmentClick ? 0 : undefined} onClick={onSegmentClick
                    ? () => onSegmentClick(seg.key)
                    : undefined} onKeyDown={onSegmentClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSegmentClick(seg.key);
                        }
                    }
                    : undefined}/>);
            offset += len;
            return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className={cn("font-medium text-neutral-500", compact ? "text-[9px]" : "text-[10px]")}>
          {centerLabel}
        </p>
        <p className={cn("font-bold tabular-nums text-neutral-900", compact ? "text-base" : "text-xl")}>
          {centerValue}
        </p>
      </div>
    </div>);
}
export function TopProductsSimple({ products, }: {
    products: {
        name: string;
        quantity: number;
        revenue: number;
    }[];
}) {
    if (products.length === 0) {
        return (<p className="py-6 text-center text-sm text-neutral-400">
        No product sales this week
      </p>);
    }
    return (<ul className="space-y-0">
      {products.slice(0, 5).map((p, i) => (<li key={p.name} className="flex min-w-0 items-center justify-between gap-4 border-b border-neutral-50 py-3 last:border-0">
          <span className="min-w-0 truncate text-sm text-neutral-800">
            <span className="mr-2 tabular-nums text-neutral-300">{i + 1}</span>
            {p.name}
            <span className="ml-2 text-xs text-neutral-400">{p.quantity}×</span>
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-900">
            {formatMoney(p.revenue)}
          </span>
        </li>))}
    </ul>);
}

