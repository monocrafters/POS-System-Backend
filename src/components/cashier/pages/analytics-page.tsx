"use client";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonStatStrip } from "@/components/ui/skeleton";
import { useCashierAnalytics } from "@/hooks/use-cashier-analytics";
import { PeriodSelector, SalesBarChart, SalesDonutChart, TopProductsSimple, type SalesPeriod, } from "@/components/cashier/analytics/analytics-charts";
import { sumSeries } from "@/lib/analytics/sales-series";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
const PERIOD_SUB: Record<SalesPeriod, string> = {
    day: "Today by hour",
    week: "Last 7 days",
    month: "Last 30 days",
    year: "Last 12 months",
};
const DONUT_COLORS = [
    "#171717",
    "#525252",
    "#a3a3a3",
    "#d4d4d4",
    "#e5e5e5",
];
function StatBlock({ label, value, hint, }: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (<div className="min-w-0">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 truncate text-xl font-semibold tabular-nums text-neutral-900 sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-neutral-400">{hint}</p>}
    </div>);
}
export function AnalyticsPage() {
    const { data, loading, refreshing, refresh } = useCashierAnalytics();
    const [refreshingUi, setRefreshingUi] = useState(false);
    const [period, setPeriod] = useState<SalesPeriod>("week");
    const onRefresh = async () => {
        setRefreshingUi(true);
        await refresh();
        setRefreshingUi(false);
    };
    const chartDays = data?.series?.[period] ?? data?.last7Days ?? [];
    const periodTotals = useMemo(() => sumSeries(chartDays), [chartDays]);
    const donutSegments = useMemo(() => {
        const top = data?.topProducts?.slice(0, 5) ?? [];
        if (top.length === 0)
            return [];
        return top.map((p, i) => ({
            label: p.name,
            value: p.revenue,
            color: DONUT_COLORS[i] ?? DONUT_COLORS[4],
        }));
    }, [data?.topProducts]);
    return (<div className="pb-10">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <p className="text-sm text-neutral-500">Your counter overview</p>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-neutral-600" onClick={() => void onRefresh()} disabled={refreshingUi || refreshing}>
          <RefreshCw className={cn("h-3.5 w-3.5", (refreshingUi || refreshing) && "animate-spin")}/>
          Refresh
        </Button>
      </div>

      {loading ? (<>
          <div className="border-b border-neutral-100 py-5">
            <SkeletonStatStrip />
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_minmax(380px,480px)]">
            <Skeleton className="h-40 w-full"/>
            <Skeleton className="h-40 w-full"/>
          </div>
        </>) : (<>
          <div className="grid grid-cols-2 gap-6 border-b border-neutral-100 py-5 sm:grid-cols-4">
            <StatBlock label="Today" value={formatMoney(data?.today.sales ?? 0)}/>
            <StatBlock label="Net today" value={formatMoney(data?.today.netRevenue ?? 0)}/>
            <StatBlock label={`Period sales`} value={formatMoney(periodTotals.sales)} hint={`${periodTotals.bills} bills · ${PERIOD_SUB[period]}`}/>
            <StatBlock label="Avg bill" value={formatMoney(data?.allTime.avgBill ?? 0)} hint="All time"/>
          </div>

          <section className="mt-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,480px)] lg:items-stretch">
              <div className="flex min-w-0 flex-col">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-medium text-neutral-900">
                      Sales
                    </h2>
                    <p className="text-xs text-neutral-400">
                      {PERIOD_SUB[period]}
                    </p>
                  </div>
                  <PeriodSelector value={period} onChange={setPeriod}/>
                </div>
                <div className="flex flex-1 flex-col rounded-lg border border-neutral-100 bg-neutral-50/50 px-4 py-5">
                  <SalesBarChart days={chartDays} compact={period === "month" || period === "year"}/>
                </div>
              </div>
              <div className="flex min-w-0 flex-col rounded-lg border border-neutral-100 px-5 py-5">
                <p className="mb-4 text-center text-xs font-medium text-neutral-500">
                  Top sellers
                </p>
                <SalesDonutChart segments={donutSegments} centerLabel="Total" centerValue={formatMoney(donutSegments.reduce((s, x) => s + x.value, 0))}/>
              </div>
            </div>
          </section>

          <section className="mt-8 border-t border-neutral-100 pt-6">
            <h2 className="mb-4 text-sm font-medium text-neutral-900">
              Top products
            </h2>
            <TopProductsSimple products={data?.topProducts ?? []}/>
          </section>
        </>)}
    </div>);
}

