"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Search, RefreshCw, ChevronRight, X, Receipt, Trash2, } from "lucide-react";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ThermalReceipt } from "@/components/cashier/thermal-receipt";
import { useAuthStore } from "@/store/auth-store";
import { apiFetchBills, apiDeleteBill, billToReceiptData, type BillRecord, } from "@/lib/api-client";
import { invalidateCashierAnalyticsCache } from "@/hooks/use-cashier-analytics";
import { formatMoney, formatReceiptDate, resolveReceiptWidth, printThermalReceipt, type ReceiptBillData, type ReceiptWidthMm, } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import { useShopBranding } from "@/hooks/use-shop-settings";
function highlightBillNumber(billNumber: string, query: string) {
    const q = query.trim().toLowerCase();
    if (!q)
        return billNumber;
    const lower = billNumber.toLowerCase();
    const i = lower.indexOf(q);
    if (i < 0)
        return billNumber;
    return (<>
      {billNumber.slice(0, i)}
      <mark className="rounded bg-red-100 px-0.5 font-bold text-red-800">
        {billNumber.slice(i, i + q.length)}
      </mark>
      {billNumber.slice(i + q.length)}
    </>);
}
export function BillsHistoryPage() {
    const token = useAuthStore((s) => s.token);
    const { shopName, shopTagline, phone: receiptPhone } = useShopBranding();
    const [allBills, setAllBills] = useState<BillRecord[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [preview, setPreview] = useState<ReceiptBillData | null>(null);
    const [previewBill, setPreviewBill] = useState<BillRecord | null>(null);
    const [receiptWidth, setReceiptWidth] = useState<ReceiptWidthMm>(80);
    const [open, setOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<BillRecord | null>(null);
    const [deleting, setDeleting] = useState(false);
    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setInitialLoading(true);
        try {
            const data = await apiFetchBills(token, { limit: 200 });
            setAllBills(data.bills);
        }
        catch {
            if (!isRefresh)
                setAllBills([]);
        }
        finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    }, [token]);
    useEffect(() => {
        void resolveReceiptWidth().then(({ widthMm }) => setReceiptWidth(widthMm));
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    const filteredBills = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return allBills;
        return allBills.filter((b) => b.billNumber.toLowerCase().includes(q) ||
            b.id.toLowerCase().includes(q));
    }, [allBills, search]);
    const resultLabel = useMemo(() => {
        if (initialLoading)
            return "Loading bills…";
        const n = filteredBills.length;
        if (search.trim()) {
            return `${n} match${n === 1 ? "" : "es"} of ${allBills.length}`;
        }
        return `${n} bill${n === 1 ? "" : "s"}`;
    }, [filteredBills.length, allBills.length, initialLoading, search]);
    const openBill = (bill: BillRecord) => {
        setPreviewBill(bill);
        setPreview(billToReceiptData(bill));
        setOpen(true);
    };
    const confirmDelete = async () => {
        if (!deleteTarget)
            return;
        setDeleting(true);
        try {
            await apiDeleteBill(token, deleteTarget.id);
            setDeleteTarget(null);
            invalidateCashierAnalyticsCache();
            await load(true);
        }
        catch {
            setDeleteTarget(null);
        }
        finally {
            setDeleting(false);
        }
    };
    return (<div className="flex h-full min-h-0 flex-col">
      
      <div className="shrink-0 space-y-4 border-b border-neutral-200/80 bg-neutral-50/95 pb-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">{resultLabel}</p>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2 rounded-lg border-neutral-200 bg-white shadow-sm" onClick={() => void load(true)} disabled={refreshing || initialLoading}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}/>
            Refresh
          </Button>
        </div>

        <div className={cn("flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-shadow", search.trim()
            ? "border-red-200 ring-2 ring-red-50"
            : "border-neutral-200 focus-within:border-red-200 focus-within:ring-2 focus-within:ring-red-50")}>
          <Search className={cn("h-5 w-5 shrink-0", search.trim() ? "text-red-600" : "text-neutral-400")}/>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bill ID…" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-neutral-900 outline-none placeholder:font-normal placeholder:text-neutral-400"/>
          {search.trim() ? (<button type="button" onClick={() => setSearch("")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700" aria-label="Clear search">
              <X className="h-4 w-4"/>
            </button>) : (<span className="hidden shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:inline">
              Instant
            </span>)}
        </div>
      </div>

      
      <div className="scrollbar-modern min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {initialLoading ? (<SkeletonRows count={8}/>) : filteredBills.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 text-center">
            <Receipt className="mb-3 h-10 w-10 text-neutral-300"/>
            <p className="font-medium text-neutral-700">
              {search.trim() ? "No matching bills" : "No bills yet"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {search.trim()
                ? "Try another bill ID"
                : "Completed sales will appear here"}
            </p>
          </div>) : (<ul className="divide-y divide-neutral-100">
            {filteredBills.map((b) => (<li key={b.id}>
                <div className="group flex w-full min-w-0 items-center gap-2 py-3.5 sm:gap-3 sm:py-4">
                  <button type="button" onClick={() => openBill(b)} className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:bg-white active:bg-neutral-100 sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 group-hover:bg-red-100">
                    <Receipt className="h-5 w-5"/>
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block truncate text-base font-bold text-neutral-900">
                      {highlightBillNumber(b.billNumber, search)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      {formatReceiptDate(b.createdAt)} · {b.itemCount} items
                      {b.discountAmount > 0 && (<> · disc {formatMoney(b.discountAmount)}</>)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-bold tabular-nums text-[#E31837]">
                      {formatMoney(b.total)}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-neutral-300 group-hover:text-red-500"/>
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(b)} className="mr-2 shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete bill">
                    <Trash2 className="h-4 w-4"/>
                  </button>
                </div>
              </li>))}
          </ul>)}
      </div>

      <Modal open={open && !!preview} onClose={() => setOpen(false)} title="Receipt" description={previewBill?.billNumber} className="max-w-[420px]">
        {preview && (<div className="space-y-4">
            <div className="max-h-[55vh] overflow-auto rounded-lg border bg-neutral-50 p-4">
              <ThermalReceipt bill={preview} widthMm={receiptWidth} shopName={shopName} shopTagline={shopTagline} shopPhone={receiptPhone}/>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="button" className="flex-1 gap-2 bg-red-600 hover:bg-red-700" onClick={() => printThermalReceipt(receiptWidth)}>
                <Printer className="h-4 w-4"/>
                Print
              </Button>
            </div>
          </div>)}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete bill?" description={deleteTarget?.billNumber} className="max-w-md">
        <p className="text-sm text-neutral-600">
          This will remove the bill and restore stock. Bills with returns cannot be deleted.
        </p>
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700" disabled={deleting} onClick={() => void confirmDelete()}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>);
}

