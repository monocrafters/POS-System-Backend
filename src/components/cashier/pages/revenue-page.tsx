"use client";
import { useState } from "react";
import { useCashierAnalytics } from "@/hooks/use-cashier-analytics";
import { AnalyticsHeader, CompactStatStrip, RevenuePanel, } from "@/components/cashier/analytics/analytics-ui";
import { Skeleton, SkeletonStatStrip } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/receipt";
export function RevenuePage() {
    const { data, loading, refreshing, refresh } = useCashierAnalytics();
    const [refreshingUi, setRefreshingUi] = useState(false);
    const onRefresh = async () => {
        setRefreshingUi(true);
        await refresh();
        setRefreshingUi(false);
    };
    const t = data?.today;
    const a = data?.allTime;
    return (<div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-neutral-200/80 bg-neutral-50/95 pb-4 backdrop-blur-sm">
        <AnalyticsHeader subtitle="Net revenue" onRefresh={() => void onRefresh()} refreshing={refreshingUi || refreshing}/>
        {loading ? (<>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20"/>
              <Skeleton className="h-9 w-40"/>
            </div>
            <SkeletonStatStrip />
          </>) : (<>
            <div className="flex items-end justify-between gap-4 border-b border-neutral-100 pb-3">
              <div>
                <p className="text-xs text-neutral-500">All-time net</p>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-[#E31837]">
                  {formatMoney(a?.netRevenue ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500">Today net</p>
                <p className="text-xl font-bold tabular-nums text-neutral-900">
                  {formatMoney(t?.netRevenue ?? 0)}
                </p>
              </div>
            </div>
            <CompactStatStrip metrics={[
                { label: "Today gross", value: formatMoney(t?.sales ?? 0) },
                {
                    label: "Today refunds",
                    value: formatMoney(t?.refunds ?? 0),
                    tone: "green",
                },
                { label: "All gross", value: formatMoney(a?.sales ?? 0) },
                {
                    label: "All refunds",
                    value: formatMoney(a?.refunds ?? 0),
                    tone: "green",
                },
            ]}/>
          </>)}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pt-4 [scrollbar-width:thin]">
        {loading ? (<div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-36 w-full rounded-lg"/>
            <Skeleton className="h-36 w-full rounded-lg"/>
          </div>) : (<div className="grid gap-4 sm:grid-cols-2">
            <RevenuePanel title="Today" gross={t?.sales ?? 0} refunds={t?.refunds ?? 0} net={t?.netRevenue ?? 0}/>
            <RevenuePanel title="All time" gross={a?.sales ?? 0} refunds={a?.refunds ?? 0} net={a?.netRevenue ?? 0}/>
          </div>)}
      </div>
    </div>);
}

