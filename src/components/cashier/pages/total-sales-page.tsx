"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useCashierAnalytics } from "@/hooks/use-cashier-analytics";
import { apiFetchBills, type BillRecord } from "@/lib/api-client";
import { AnalyticsHeader, CompactStatStrip, SectionTitle, } from "@/components/cashier/analytics/analytics-ui";
import { SalesBillRow } from "@/components/cashier/analytics/sales-bill-row";
import { SkeletonStatStrip, SkeletonRows } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/receipt";
export function TotalSalesPage() {
    const token = useAuthStore((s) => s.token);
    const { data, loading, refreshing, refresh } = useCashierAnalytics();
    const [refreshingUi, setRefreshingUi] = useState(false);
    const [allBills, setAllBills] = useState<BillRecord[]>([]);
    const [billsLoading, setBillsLoading] = useState(true);
    const loadBills = async () => {
        try {
            const res = await apiFetchBills(token, { limit: 200 });
            setAllBills(res.bills);
        }
        catch {
            setAllBills([]);
        }
        finally {
            setBillsLoading(false);
        }
    };
    useEffect(() => {
        setBillsLoading(true);
        void loadBills();
    }, [token]);
    const onRefresh = async () => {
        setRefreshingUi(true);
        setBillsLoading(true);
        await Promise.all([refresh(), loadBills()]);
        setRefreshingUi(false);
    };
    const a = data?.allTime;
    const listLoading = loading || billsLoading;
    return (<div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-neutral-200/80 bg-neutral-50/95 pb-4 backdrop-blur-sm">
        <AnalyticsHeader subtitle="All-time" onRefresh={() => void onRefresh()} refreshing={refreshingUi || refreshing}/>
        {loading ? (<SkeletonStatStrip />) : (<CompactStatStrip metrics={[
                {
                    label: "Total sales",
                    value: formatMoney(a?.sales ?? 0),
                    sub: "Gross",
                    tone: "red",
                },
                {
                    label: "Total bills",
                    value: String(a?.bills ?? 0),
                    sub: `${a?.items ?? 0} items`,
                },
                {
                    label: "Avg bill",
                    value: formatMoney(a?.avgBill ?? 0),
                },
                {
                    label: "Returns",
                    value: formatMoney(a?.refunds ?? 0),
                    sub: `${a?.returnCount ?? 0} processed`,
                    tone: "green",
                },
            ]}/>)}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:thin]">
        <SectionTitle count={listLoading ? undefined : allBills.length}>
          All sales
        </SectionTitle>
        {listLoading ? (<SkeletonRows count={8}/>) : allBills.length === 0 ? (<p className="py-12 text-center text-sm text-neutral-500">
            No sales yet
          </p>) : (<ul>
            {allBills.map((b) => (<SalesBillRow key={b.id} billNumber={b.billNumber} createdAt={b.createdAt} itemCount={b.itemCount} total={b.total} discountAmount={b.discountAmount}/>))}
          </ul>)}
      </div>
    </div>);
}

