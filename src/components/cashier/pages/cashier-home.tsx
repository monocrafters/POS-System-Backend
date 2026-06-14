"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ScanBarcode, Receipt, RotateCcw, Package, AlertTriangle, PackageX, BarChart3, ArrowRight, RefreshCw, Sun, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonStatStrip } from "@/components/ui/skeleton";
import { SalesBarChart } from "@/components/cashier/analytics/analytics-charts";
import { useAuthStore } from "@/store/auth-store";
import { useCashierAnalytics } from "@/hooks/use-cashier-analytics";
import { apiFetchCashierStock, type CashierStockItem, type CashierStockSummary, } from "@/lib/api-client";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import type { CashierSectionId } from "../cashier-nav";
interface CashierHomeProps {
    onNavigate: (id: CashierSectionId) => void;
}
function formatBillTime(iso: string) {
    return new Date(iso).toLocaleString("en-PK", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}
export function CashierHome({ onNavigate }: CashierHomeProps) {
    const user = useAuthStore((s) => s.user);
    const token = useAuthStore((s) => s.token);
    const { data, loading, refreshing, refresh, error } = useCashierAnalytics();
    const [stockSummary, setStockSummary] = useState<CashierStockSummary | null>(null);
    const [stockAlerts, setStockAlerts] = useState<CashierStockItem[]>([]);
    const loadStock = useCallback(async () => {
        try {
            const res = await apiFetchCashierStock(token);
            setStockSummary(res.summary);
            const alerts = res.products
                .filter((p) => p.status === "out" || p.status === "low")
                .slice(0, 8);
            setStockAlerts(alerts);
        }
        catch {
            setStockSummary(null);
            setStockAlerts([]);
        }
    }, [token]);
    useEffect(() => {
        void loadStock();
    }, [loadStock]);
    const handleRefresh = () => {
        void refresh();
        void loadStock();
    };
    const outProducts = useMemo(() => stockAlerts.filter((p) => p.status === "out"), [stockAlerts]);
    const lowProducts = useMemo(() => stockAlerts.filter((p) => p.status === "low"), [stockAlerts]);
    const weekSales = useMemo(() => data?.series.week.reduce((s, d) => s + d.sales, 0) ?? 0, [data]);
    const hasStockAlerts = (stockSummary?.out ?? 0) > 0 || (stockSummary?.low ?? 0) > 0;
    const hasReturnsToday = (data?.today.returnCount ?? 0) > 0;
    if (loading && !data) {
        return (<div className="flex min-h-full w-full flex-col">
        <div className="border-b border-neutral-200 px-5 py-4 lg:px-8">
          <Skeleton className="h-8 w-48"/>
          <Skeleton className="mt-2 h-4 w-64"/>
        </div>
        <div className="border-b border-neutral-200 px-5 py-4 lg:px-8">
          <SkeletonStatStrip />
        </div>
        <Skeleton className="m-5 h-48 lg:mx-8"/>
      </div>);
    }
    return (<div className="flex min-h-full w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Hello, {user?.fullName?.split(" ")[0] ?? "Cashier"}
          </h2>
          <p className="text-sm text-neutral-500">Your shift overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onNavigate("billing")} className="h-9 gap-2 rounded-lg bg-[#E31837] hover:bg-red-700">
            <ScanBarcode className="h-4 w-4"/>
            New sale
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2" disabled={refreshing} onClick={handleRefresh}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")}/>
            Refresh
          </Button>
        </div>
      </div>

      {error && (<p className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700 lg:px-8">
          {error}
        </p>)}

      {(hasStockAlerts || hasReturnsToday) && (<div className="space-y-3 border-b border-neutral-200 bg-neutral-50/90 px-5 py-4 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Reminders
          </p>

          {stockSummary && stockSummary.out > 0 && (<ReminderCard variant="danger" icon={PackageX} title={`${stockSummary.out} product${stockSummary.out === 1 ? "" : "s"} out of stock`} description="Cannot sell these until stock is updated." actionLabel="View stocks" onAction={() => onNavigate("stocks")}>
              <ul className="mt-2 space-y-1 text-sm">
                {outProducts.slice(0, 5).map((p) => (<li key={p.id} className="flex justify-between gap-2">
                    <span className="font-medium text-neutral-800">
                      {p.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-red-700">
                      0 left
                    </span>
                  </li>))}
                {stockSummary.out > 5 && (<li className="text-xs text-neutral-500">
                    +{stockSummary.out - 5} more
                  </li>)}
              </ul>
            </ReminderCard>)}

          {stockSummary && stockSummary.low > 0 && (<ReminderCard variant="warning" icon={AlertTriangle} title={`${stockSummary.low} product${stockSummary.low === 1 ? "" : "s"} low on stock`} description="May run out soon — check before selling large quantities." actionLabel="View stocks" onAction={() => onNavigate("stocks")}>
              <ul className="mt-2 space-y-1 text-sm">
                {lowProducts.slice(0, 5).map((p) => (<li key={p.id} className="flex justify-between gap-2">
                    <span className="text-neutral-800">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-amber-800">
                      {p.stock} left
                    </span>
                  </li>))}
                {stockSummary.low > 5 && (<li className="text-xs text-neutral-500">
                    +{stockSummary.low - 5} more
                  </li>)}
              </ul>
            </ReminderCard>)}

          {hasReturnsToday && data && (<ReminderCard variant="warning" icon={RotateCcw} title={`${data.today.returnCount} return${data.today.returnCount === 1 ? "" : "s"} today`} description={`Refunds processed: ${formatMoney(data.today.refunds)}`} actionLabel="Returns" onAction={() => onNavigate("returns")}/>)}
        </div>)}

      {data && (<>
          <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-100 sm:grid-cols-3 lg:grid-cols-6">
            <StatCell label="Today net" value={formatMoney(data.today.netRevenue)}/>
            <StatCell label="Today bills" value={String(data.today.bills)}/>
            <StatCell label="Items sold" value={String(data.today.items)}/>
            <StatCell label="Week sales" value={formatMoney(weekSales)}/>
            <StatCell label="All-time net" value={formatMoney(data.allTime.netRevenue)}/>
            <StatCell label="Avg bill" value={formatMoney(data.allTime.avgBill)}/>
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] lg:divide-x lg:divide-neutral-200">
            <div className="border-b border-neutral-200 px-5 py-4 lg:border-b-0 lg:px-8">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-neutral-800">
                  Your sales · last 7 days
                </p>
                <button type="button" onClick={() => onNavigate("analytics")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#E31837] hover:underline">
                  Full analytics
                  <ArrowRight className="h-3 w-3"/>
                </button>
              </div>
              <SalesBarChart days={data.series.week}/>
            </div>

            <div className="px-5 py-4 lg:px-8">
              <p className="mb-3 text-sm font-medium text-neutral-800">
                Quick actions
              </p>
              <div className="grid gap-2">
                {([
                ["New sale", ScanBarcode, "billing"],
                ["My bills", Receipt, "bills"],
                ["Returns", RotateCcw, "returns"],
                ["Stocks", Package, "stocks"],
                ["Today sales", Sun, "today-sales"],
                ["Analytics", BarChart3, "analytics"],
            ] as const).map(([label, Icon, id]) => (<button key={id} type="button" onClick={() => onNavigate(id)} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 text-left text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50">
                    <Icon className="h-4 w-4 shrink-0 text-[#E31837]"/>
                    {label}
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-neutral-400"/>
                  </button>))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-neutral-200">
            <div className="border-b border-neutral-200 px-5 py-4 lg:border-b-0 lg:px-8">
              <p className="mb-3 text-sm font-medium text-neutral-800">
                Top products (30 days)
              </p>
              {data.topProducts.length === 0 ? (<p className="text-sm text-neutral-500">No sales yet</p>) : (<ul className="divide-y divide-neutral-100">
                  {data.topProducts.slice(0, 6).map((p, i) => (<li key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-neutral-800">
                        <span className="mr-2 text-neutral-300">{i + 1}</span>
                        {p.name}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatMoney(p.revenue)}
                      </span>
                    </li>))}
                </ul>)}
            </div>

            <div className="px-5 py-4 lg:px-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-800">
                  Today&apos;s bills
                </p>
                <button type="button" onClick={() => onNavigate("bills")} className="text-xs font-semibold text-[#E31837] hover:underline">
                  View all
                </button>
              </div>
              {data.recentTodayBills.length === 0 ? (<p className="text-sm text-neutral-500">
                  No bills yet today. Start with New sale.
                </p>) : (<ul className="divide-y divide-neutral-100">
                  {data.recentTodayBills.map((b) => (<li key={b.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-neutral-700">
                          {b.billNumber}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatBillTime(b.createdAt)} · {b.itemCount} items
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(b.total)}
                      </span>
                    </li>))}
                </ul>)}
            </div>
          </div>
        </>)}
    </div>);
}
function ReminderCard({ variant, icon: Icon, title, description, actionLabel, onAction, children, }: {
    variant: "danger" | "warning";
    icon: typeof AlertTriangle;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    children?: ReactNode;
}) {
    const styles = {
        danger: "border-red-200 bg-red-50/80",
        warning: "border-amber-200 bg-amber-50/80",
    };
    const iconStyles = {
        danger: "text-red-700",
        warning: "text-amber-800",
    };
    return (<div className={cn("rounded-lg border px-4 py-3", styles[variant])} role="alert">
      <div className="flex flex-wrap items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconStyles[variant])}/>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className="mt-0.5 text-xs text-neutral-600">{description}</p>
          {children}
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 border-neutral-300 bg-white text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>);
}
function StatCell({ label, value }: {
    label: string;
    value: string;
}) {
    return (<div className="bg-white px-4 py-3 lg:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">
        {value}
      </p>
    </div>);
}

