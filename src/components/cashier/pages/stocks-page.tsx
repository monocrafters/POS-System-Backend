"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, RefreshCw, Package, AlertTriangle, PackageX, ChevronLeft, ArrowRight, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { StockDonutChart } from "@/components/cashier/analytics/analytics-charts";
import { useAuthStore } from "@/store/auth-store";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
interface StockItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    barcode: string;
    status: "ok" | "low" | "out";
}
interface StockSummary {
    total: number;
    out: number;
    low: number;
    inStock: number;
}
type StockStatusFilter = "ok" | "low" | "out";
const STATUS_META: Record<StockStatusFilter, {
    label: string;
    short: string;
    color: string;
    card: string;
    banner: string;
    ring: string;
    value: string;
    icon: typeof Package;
}> = {
    ok: {
        label: "In stock",
        short: "OK",
        color: "#16a34a",
        card: "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200 hover:bg-emerald-50",
        banner: "border-emerald-100 bg-emerald-50/80",
        ring: "ring-emerald-500/30",
        value: "text-emerald-800",
        icon: Package,
    },
    low: {
        label: "Low stock",
        short: "Low",
        color: "#d97706",
        card: "border-amber-100 bg-amber-50/60 hover:border-amber-200 hover:bg-amber-50",
        banner: "border-amber-100 bg-amber-50/80",
        ring: "ring-amber-500/30",
        value: "text-amber-800",
        icon: AlertTriangle,
    },
    out: {
        label: "Out of stock",
        short: "Out",
        color: "#dc2626",
        card: "border-red-100 bg-red-50/60 hover:border-red-200 hover:bg-red-50",
        banner: "border-red-100 bg-red-50/80",
        ring: "ring-red-500/30",
        value: "text-red-700",
        icon: PackageX,
    },
};
function StockProductRow({ p }: {
    p: StockItem;
}) {
    const meta = STATUS_META[p.status === "ok" ? "ok" : p.status];
    const Icon = meta.icon;
    return (<li className="flex min-w-0 items-center gap-3 py-3.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", p.status === "out"
            ? "bg-red-50 text-red-600"
            : p.status === "low"
                ? "bg-amber-50 text-amber-700"
                : "bg-neutral-100 text-neutral-600")}>
        <Icon className="h-4 w-4"/>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-neutral-900">
          {p.name}
        </span>
        <span className="text-xs text-neutral-400">
          {p.barcode || "—"} · {formatMoney(p.price)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={cn("block text-lg font-bold tabular-nums", meta.value)}>
          {p.stock}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          {meta.short}
        </span>
      </span>
    </li>);
}
export function StocksPage() {
    const token = useAuthStore((s) => s.token);
    const [items, setItems] = useState<StockItem[]>([]);
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [detailFilter, setDetailFilter] = useState<StockStatusFilter | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const load = useCallback(async () => {
        if (!token)
            return;
        const res = await fetch("/api/pos/stock", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            throw new Error("Failed to load stock");
        const data = (await res.json()) as {
            success: boolean;
            products: StockItem[];
            summary: StockSummary;
        };
        setItems(data.products);
        setSummary(data.summary);
    }, [token]);
    useEffect(() => {
        setLoading(true);
        void load()
            .catch(() => {
            setItems([]);
            setSummary(null);
        })
            .finally(() => setLoading(false));
    }, [load]);
    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await load();
        }
        finally {
            setRefreshing(false);
        }
    };
    const openDetail = (status: StockStatusFilter) => {
        setDetailFilter(status);
        setSearch("");
        requestAnimationFrame(() => {
            listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };
    const closeDetail = () => {
        setDetailFilter(null);
        setSearch("");
    };
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((p) => {
            if (detailFilter && p.status !== detailFilter)
                return false;
            if (!q)
                return true;
            return (p.name.toLowerCase().includes(q) ||
                p.barcode.toLowerCase().includes(q));
        });
    }, [items, search, detailFilter]);
    const donutSegments = useMemo(() => {
        if (!summary)
            return [];
        return [
            {
                key: "ok" as const,
                label: "In stock",
                value: summary.inStock,
                color: STATUS_META.ok.color,
            },
            {
                key: "low" as const,
                label: "Low",
                value: summary.low,
                color: STATUS_META.low.color,
            },
            {
                key: "out" as const,
                label: "Out",
                value: summary.out,
                color: STATUS_META.out.color,
            },
        ];
    }, [summary]);
    const statCards = summary
        ? ([
            { key: "ok" as const, value: summary.inStock },
            { key: "low" as const, value: summary.low },
            { key: "out" as const, value: summary.out },
        ] as const)
        : [];
    const detailMeta = detailFilter ? STATUS_META[detailFilter] : null;
    return (<div className="pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2">
        {summary && !loading && !detailFilter && (<p className="text-xs text-neutral-500">
            {summary.total} products · {summary.low} low · {summary.out} out
          </p>)}
        {detailFilter && detailMeta && !loading && (<button type="button" onClick={closeDetail} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 transition-colors hover:text-neutral-900">
            <ChevronLeft className="h-3.5 w-3.5"/>
            Back
          </button>)}
        {loading && <Skeleton className="h-3.5 w-40"/>}
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => void onRefresh()} disabled={refreshing}>
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}/>
          Refresh
        </Button>
      </div>

      {!loading && summary && !detailFilter && (<div className="mt-3 flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
          <StockDonutChart compact segments={donutSegments} centerLabel="Products" centerValue={String(summary.total)} onSegmentClick={(key) => openDetail(key as StockStatusFilter)}/>
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
            {statCards.map(({ key, value }) => {
                const meta = STATUS_META[key];
                const Icon = meta.icon;
                return (<button key={key} type="button" onClick={() => openDetail(key)} className={cn("group rounded-lg border px-2.5 py-2 text-left transition-all", "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2", meta.card, meta.ring)}>
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-md bg-white/80", meta.value)}>
                      <Icon className="h-3.5 w-3.5"/>
                    </span>
                    <ArrowRight className="h-3 w-3 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500"/>
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    {meta.label}
                  </p>
                  <p className={cn("text-lg font-bold tabular-nums leading-none", meta.value)}>
                    {value}
                  </p>
                </button>);
            })}
          </div>
        </div>)}

      {detailFilter && detailMeta && !loading && summary && (<div className={cn("mt-3 rounded-lg border px-3 py-2", detailMeta.banner)}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            {detailMeta.label}
          </p>
          <p className={cn("text-lg font-bold tabular-nums", detailMeta.value)}>
            {detailFilter === "ok"
                ? summary.inStock
                : detailFilter === "low"
                    ? summary.low
                    : summary.out}{" "}
            <span className="text-sm font-medium text-neutral-500">
              products
            </span>
          </p>
        </div>)}

      <div ref={listRef} className="mt-3 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"/>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product or barcode…" className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-400"/>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (<SkeletonRows count={10}/>) : filtered.length === 0 ? (<p className="py-16 text-center text-sm text-neutral-500">
            {detailFilter
                ? `No ${STATUS_META[detailFilter].label.toLowerCase()} products`
                : "No products match"}
          </p>) : (<ul className="divide-y divide-neutral-100">
            {filtered.map((p) => (<StockProductRow key={p.id} p={p}/>))}
          </ul>)}
      </div>
    </div>);
}

