"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertTriangle, PackageX, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { apiAdminStockAnalytics, type AdminStockAnalytics, type StockAnalyticsRow, } from "@/lib/api-client";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
type StockFilter = "all" | "out" | "low" | "reorder";
const STATUS_STYLE = {
    out: "text-red-700 bg-red-50",
    low: "text-amber-800 bg-amber-50",
    ok: "text-emerald-800 bg-emerald-50",
} as const;
export function AdminStockAnalyticsPage() {
    const token = useAuthStore((s) => s.token);
    const [data, setData] = useState<AdminStockAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<StockFilter>("all");
    const [search, setSearch] = useState("");
    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setLoading(true);
        try {
            const res = await apiAdminStockAnalytics(token);
            setData({ summary: res.summary, products: res.products });
        }
        catch {
            if (!isRefresh)
                setData(null);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);
    useEffect(() => {
        void load();
    }, [load]);
    const filtered = useMemo(() => {
        if (!data)
            return [];
        const q = search.trim().toLowerCase();
        return data.products.filter((p) => {
            if (filter === "out" && p.status !== "out")
                return false;
            if (filter === "low" && p.status !== "low")
                return false;
            if (filter === "reorder" && p.orderQty <= 0)
                return false;
            if (q && !p.name.toLowerCase().includes(q) && !p.barcode.includes(q)) {
                return false;
            }
            return true;
        });
    }, [data, filter, search]);
    return (<div className="flex min-h-full w-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        {data && (<p className="text-sm text-neutral-600">
            <span className="font-medium text-neutral-900">
              {data.summary.total} products
            </span>
            {" · "}
            <span className="text-red-600">{data.summary.out} out</span>
            {" · "}
            <span className="text-amber-700">{data.summary.low} low</span>
            {" · "}
            <span className="font-medium text-[#E31837]">
              Order ~{data.summary.unitsToOrder} units
            </span>
          </p>)}
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product…" className="h-9 min-w-[160px] flex-1 rounded-lg border border-neutral-200 px-3 text-sm sm:max-w-xs"/>
        <div className="inline-flex rounded-lg border border-neutral-200 p-0.5">
          {([
            ["all", "All"],
            ["reorder", "Need order"],
            ["low", "Low"],
            ["out", "Out"],
        ] as const).map(([id, label]) => (<button key={id} type="button" onClick={() => setFilter(id)} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", filter === id
                ? "bg-neutral-900 text-white"
                : "text-neutral-500")}>
              {label}
            </button>))}
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2" disabled={refreshing} onClick={() => void load(true)}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")}/>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-100 text-center sm:grid-cols-4">
        <SummaryCell label="In hand (OK)" value={data?.summary.ok ?? "—"} tone="ok"/>
        <SummaryCell label="Low stock" value={data?.summary.low ?? "—"} tone="low"/>
        <SummaryCell label="Out of stock" value={data?.summary.out ?? "—"} tone="out"/>
        <SummaryCell label="Suggested order" value={data?.summary.unitsToOrder ?? "—"} tone="order"/>
      </div>

      <p className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-2 text-xs text-neutral-500 lg:px-8">
        <strong>In hand</strong> = current quantity · <strong>Sold 7d/30d</strong> =
        sales speed · <strong>Days left</strong> = stock ÷ daily average ·{" "}
        <strong>Target</strong> = ideal stock for ~14 days cover ·{" "}
        <strong>Order qty</strong> = units to order (Target − In hand) ·{" "}
        <strong>Suggested order</strong> = sum of all Order qty
      </p>

      {loading ? (<SkeletonTable rows={12} cols={9}/>) : !data ? (<p className="py-16 text-center text-sm text-neutral-500">
          Failed to load stock data
        </p>) : filtered.length === 0 ? (<p className="py-16 text-center text-sm text-neutral-500">
          No products in this filter
        </p>) : (<div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-neutral-50">
              <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 lg:px-6">Product</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">In hand</th>
                <th className="px-3 py-3 text-right">Sold 7d</th>
                <th className="px-3 py-3 text-right">Sold 30d</th>
                <th className="px-3 py-3 text-right">Avg/day</th>
                <th className="px-3 py-3 text-right">Days left</th>
                <th className="px-3 py-3 text-right">Target</th>
                <th className="px-4 py-3 text-right lg:px-6">Order qty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (<StockRow key={p.id} p={p}/>))}
            </tbody>
          </table>
        </div>)}
    </div>);
}
function SummaryCell({ label, value, tone, }: {
    label: string;
    value: number | string;
    tone: "ok" | "low" | "out" | "order";
}) {
    const colors = {
        ok: "text-emerald-700",
        low: "text-amber-700",
        out: "text-red-700",
        order: "text-[#E31837]",
    };
    return (<div className="bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className={cn("mt-0.5 text-xl font-bold tabular-nums", colors[tone])}>
        {value}
      </p>
    </div>);
}
function StockRow({ p }: {
    p: StockAnalyticsRow;
}) {
    const Icon = p.status === "out" ? PackageX : p.status === "low" ? AlertTriangle : Package;
    return (<tr className="border-b border-neutral-100 hover:bg-neutral-50/80">
      <td className="px-4 py-3 lg:px-6">
        <p className="font-medium text-neutral-900">{p.name}</p>
        <p className="font-mono text-xs text-neutral-400">
          {p.barcode || "—"} · {formatMoney(p.price)}
        </p>
      </td>
      <td className="px-3 py-3">
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold uppercase", STATUS_STYLE[p.status])}>
          <Icon className="h-3 w-3"/>
          {p.status}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-bold tabular-nums">{p.stock}</td>
      <td className="px-3 py-3 text-right tabular-nums text-neutral-600">
        {p.sold7d}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-neutral-600">
        {p.sold30d}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{p.avgPerDay}</td>
      <td className="px-3 py-3 text-right tabular-nums text-neutral-600">
        {p.daysLeft ?? "—"}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{p.targetStock}</td>
      <td className={cn("px-4 py-3 text-right font-bold tabular-nums lg:px-6", p.orderQty > 0 ? "text-[#E31837]" : "text-neutral-300")}>
        {p.orderQty > 0 ? p.orderQty : "—"}
      </td>
    </tr>);
}

