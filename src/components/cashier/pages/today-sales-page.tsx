"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonStatStrip, SkeletonRows } from "@/components/ui/skeleton";
import { useCashierAnalytics } from "@/hooks/use-cashier-analytics";
import { AnalyticsHeader, CompactStatStrip, SectionTitle, } from "@/components/cashier/analytics/analytics-ui";
import { SalesBillRow } from "@/components/cashier/analytics/sales-bill-row";
import { formatMoney } from "@/lib/receipt";
export function TodaySalesPage() {
    const { data, loading, refreshing, refresh } = useCashierAnalytics();
    const [refreshingUi, setRefreshingUi] = useState(false);
    const onRefresh = async () => {
        setRefreshingUi(true);
        await refresh();
        setRefreshingUi(false);
    };
    const t = data?.today;
    const bills = data?.recentTodayBills ?? [];
    return (<div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-neutral-200/80 bg-neutral-50/95 pb-4 backdrop-blur-sm">
        <AnalyticsHeader subtitle="Today" onRefresh={() => void onRefresh()} refreshing={refreshingUi || refreshing}/>
        {loading ? (<SkeletonStatStrip />) : (<CompactStatStrip metrics={[
                {
                    label: "Today sales",
                    value: formatMoney(t?.sales ?? 0),
                    tone: "red",
                },
                {
                    label: "Bills today",
                    value: String(t?.bills ?? 0),
                    sub: `${t?.items ?? 0} items`,
                },
                {
                    label: "Returns today",
                    value: formatMoney(t?.refunds ?? 0),
                    sub: `${t?.returnCount ?? 0} returns`,
                    tone: "green",
                },
                {
                    label: "Net today",
                    value: formatMoney(t?.netRevenue ?? 0),
                    sub: "Sales − refunds",
                },
            ]}/>)}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:thin]">
        <SectionTitle count={loading ? undefined : bills.length}>
          Today&apos;s bills
        </SectionTitle>
        {loading ? (<SkeletonRows count={5}/>) : bills.length === 0 ? (<p className="py-12 text-center text-sm text-neutral-500">
            No sales yet today
          </p>) : (<ul>
            {bills.map((b) => (<SalesBillRow key={b.id} billNumber={b.billNumber} createdAt={b.createdAt} itemCount={b.itemCount} total={b.total}/>))}
          </ul>)}
      </div>
    </div>);
}

