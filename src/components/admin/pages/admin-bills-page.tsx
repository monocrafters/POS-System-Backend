"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, Loader2, Receipt, Eye, Trash2, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SkeletonTable } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/cashier/analytics/analytics-charts";
import { ThermalReceipt } from "@/components/cashier/thermal-receipt";
import { useAuthStore } from "@/store/auth-store";
import { apiFetchBills, apiFetchStaff, apiDeleteBill, billToReceiptData, type BillListPeriod, type BillRecord, type StaffMember, } from "@/lib/api-client";
import { formatMoney, formatReceiptDate, resolveReceiptWidth, printThermalReceipt, type ReceiptBillData, type ReceiptWidthMm, } from "@/lib/receipt";
import { useShopBranding } from "@/hooks/use-shop-settings";
import { consumeBillsSearchPrefill } from "@/lib/admin-search";
export function AdminBillsPage() {
    const token = useAuthStore((s) => s.token);
    const { shopName, shopTagline, phone: receiptPhone } = useShopBranding();
    const [bills, setBills] = useState<BillRecord[]>([]);
    const [cashiers, setCashiers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState(() => consumeBillsSearchPrefill());
    const [period, setPeriod] = useState<BillListPeriod>("week");
    const [cashierId, setCashierId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [preview, setPreview] = useState<ReceiptBillData | null>(null);
    const [receiptWidth, setReceiptWidth] = useState<ReceiptWidthMm>(80);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<BillRecord | null>(null);
    const [deleting, setDeleting] = useState(false);
    useEffect(() => {
        void resolveReceiptWidth().then(({ widthMm }) => setReceiptWidth(widthMm));
        void apiFetchStaff(token)
            .then((d) => setCashiers(d.cashiers))
            .catch(() => setCashiers([]));
    }, [token]);
    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setLoading(true);
        try {
            const res = await apiFetchBills(token, {
                limit: 500,
                q: search.trim() || undefined,
                period: dateFrom || dateTo ? undefined : period,
                cashierId: cashierId || undefined,
                from: dateFrom
                    ? new Date(dateFrom).toISOString()
                    : undefined,
                to: dateTo
                    ? new Date(`${dateTo}T23:59:59`).toISOString()
                    : undefined,
            });
            setBills(res.bills);
        }
        catch {
            if (!isRefresh)
                setBills([]);
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, search, period, cashierId, dateFrom, dateTo]);
    useEffect(() => {
        const t = setTimeout(() => void load(), search ? 200 : 0);
        return () => clearTimeout(t);
    }, [load, search]);
    const openPreview = (bill: BillRecord) => {
        setPreview(billToReceiptData(bill));
        setPreviewOpen(true);
    };
    const confirmDelete = async () => {
        if (!deleteTarget)
            return;
        setDeleting(true);
        try {
            await apiDeleteBill(token, deleteTarget.id);
            setDeleteTarget(null);
            await load(true);
        }
        catch {
            setDeleteTarget(null);
        }
        finally {
            setDeleting(false);
        }
    };
    return (<div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <span className="text-sm font-medium text-neutral-700">
          {loading ? "…" : `${bills.length} bills`}
        </span>
        <PeriodSelector value={period} onChange={(p) => {
            setPeriod(p);
            setDateFrom("");
            setDateTo("");
        }}/>
        <select value={cashierId} onChange={(e) => setCashierId(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400">
          <option value="">All cashiers</option>
          {cashiers.map((c) => (<option key={c.id} value={c.id}>
              {c.fullName}
            </option>))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" title="From date"/>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" title="To date"/>
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"/>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bill no…" className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50/80 pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"/>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2" disabled={refreshing} onClick={() => void load(true)}>
          {refreshing ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<RefreshCw className="h-4 w-4"/>)}
          Refresh
        </Button>
      </div>

      {loading ? (<SkeletonTable rows={10} cols={6}/>) : bills.length === 0 ? (<div className="flex flex-col items-center py-24 text-center">
          <Receipt className="mb-3 h-10 w-10 text-neutral-300"/>
          <p className="text-sm font-medium text-neutral-700">No bills found</p>
          <p className="mt-1 text-xs text-neutral-500">
            Try another period or filter
          </p>
        </div>) : (<div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-neutral-50">
              <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3 lg:px-8">Bill no</th>
                <th className="px-5 py-3 lg:px-8">Cashier</th>
                <th className="px-5 py-3 lg:px-8">Items</th>
                <th className="px-5 py-3 lg:px-8">Total</th>
                <th className="px-5 py-3 lg:px-8">Date</th>
                <th className="px-5 py-3 text-right lg:px-8">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (<tr key={b.id} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                  <td className="px-5 py-3.5 font-mono font-medium text-neutral-900 lg:px-8">
                    {b.billNumber}
                  </td>
                  <td className="px-5 py-3.5 lg:px-8">
                    <p className="font-medium text-neutral-900">
                      {b.cashier.fullName}
                    </p>
                    <p className="text-xs text-neutral-500">
                      @{b.cashier.username}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-neutral-700 lg:px-8">
                    {b.itemCount}
                  </td>
                  <td className="px-5 py-3.5 font-semibold tabular-nums text-neutral-900 lg:px-8">
                    {formatMoney(b.total)}
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600 lg:px-8">
                    {formatReceiptDate(b.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right lg:px-8">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => openPreview(b)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#E31837] hover:bg-red-50">
                        <Eye className="h-3.5 w-3.5"/>
                        View
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(b)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5"/>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      <Modal open={previewOpen && !!preview} onClose={() => setPreviewOpen(false)} title="Receipt" className="max-w-[420px]">
        {preview && (<div className="space-y-4">
            <div className="max-h-[60vh] overflow-auto bg-neutral-50 p-4">
              <ThermalReceipt bill={preview} widthMm={receiptWidth} shopName={shopName} shopTagline={shopTagline} shopPhone={receiptPhone}/>
            </div>
            <Button type="button" className="w-full gap-2 bg-[#E31837] hover:bg-red-700" onClick={() => printThermalReceipt(receiptWidth)}>
              Print
            </Button>
          </div>)}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete bill?" description={deleteTarget?.billNumber} className="max-w-md">
        <p className="text-sm text-neutral-600">
          This will permanently remove the bill and restore product stock. Bills with returns cannot be deleted.
        </p>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700" disabled={deleting} onClick={() => void confirmDelete()}>
            {deleting ? "Deleting…" : "Delete bill"}
          </Button>
        </div>
      </Modal>
    </div>);
}

