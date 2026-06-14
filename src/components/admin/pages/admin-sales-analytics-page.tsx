"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonStatStrip } from "@/components/ui/skeleton";
import { PeriodSelector, SalesBarChart, type SalesPeriod, } from "@/components/cashier/analytics/analytics-charts";
import { useAuthStore } from "@/store/auth-store";
import { apiAdminAnalytics, type AdminAnalytics, type PeriodBreakdown, } from "@/lib/api-client";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
const PERIOD_SUB: Record<SalesPeriod, string> = {
    day: "Today",
    week: "Last 7 days",
    month: "Last 30 days",
    year: "Last 12 months",
};
export function AdminSalesAnalyticsPage() {
    const token = useAuthStore((s) => s.token);
    const [data, setData] = useState<AdminAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<SalesPeriod>("week");
    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setLoading(true);
        try {
            const res = await apiAdminAnalytics(token);
            setData(res.analytics);
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
    const chartDays = data?.series?.[period] ?? [];
    const periodStats: PeriodBreakdown | undefined = data?.periods[period];
    const topProducts = data?.topProductsByPeriod[period] ?? [];
    if (loading && !data) {
        return (<div className="w-full">
        <div className="border-b border-neutral-200 px-5 py-3 lg:px-8">
          <Skeleton className="h-9 w-64"/>
        </div>
        <div className="border-b border-neutral-200 px-5 py-4 lg:px-8">
          <SkeletonStatStrip />
        </div>
        <Skeleton className="m-5 h-40 lg:mx-8"/>
      </div>);
    }
    if (!data || !periodStats) {
        return (<p className="px-5 py-16 text-center text-sm text-neutral-500">
        Could not load sales analytics
      </p>);
    }
    return (<div className="flex min-h-full w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod}/>
          <span className="text-sm text-neutral-500">{PERIOD_SUB[period]}</span>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2" disabled={refreshing} onClick={() => void load(true)}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")}/>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-100 sm:grid-cols-4">
        <Metric label="Sales" value={formatMoney(periodStats.grossSales)}/>
        <Metric label="Profit" value={formatMoney(periodStats.grossProfit)} hint={periodStats.profitMargin > 0 ? `${periodStats.profitMargin.toFixed(0)}% margin` : undefined}/>
        <Metric label="Refunds" value={formatMoney(periodStats.refunds)}/>
        <Metric label="Bills" value={String(periodStats.bills)}/>
      </div>

      <div className="border-b border-neutral-200 px-5 py-4 lg:px-8">
        <p className="mb-3 text-sm font-medium text-neutral-800">Sales chart</p>
        <SalesBarChart days={chartDays}/>
      </div>

      <div className="px-5 py-4 lg:px-8">
        <p className="mb-3 text-sm font-medium text-neutral-800">
          Top products · {PERIOD_SUB[period]}
        </p>
        {topProducts.length === 0 ? (<p className="text-sm text-neutral-500">No sales in this period</p>) : (<table className="w-full max-w-2xl text-sm">
            <thead>
              <tr className="border-b text-xs text-neutral-500">
                <th className="py-2 text-left">Product</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Sales</th>
                <th className="py-2 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 8).map((p) => (<tr key={p.name} className="border-b border-neutral-100">
                  <td className="py-2.5 pr-2">{p.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{p.quantity}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {formatMoney(p.revenue)}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums text-green-700">
                    {formatMoney(p.profit)}
                  </td>
                </tr>))}
            </tbody>
          </table>)}
      </div>
    </div>);
}
function Metric({ label, value, hint, }: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (<div className="bg-white px-4 py-4 lg:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-neutral-400">{hint}</p>}
    </div>);
}
