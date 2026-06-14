"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, RotateCcw, AlertCircle, CheckCircle2, Minus, Plus, X, Receipt, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { apiGetReturnSettings, apiFetchBillByNumber, apiCreateReturn, apiFetchReturns, apiFetchBills, type BillForReturn, type ReturnRecord, type BillRecord, } from "@/lib/api-client";
import { formatMoney, formatReceiptDate } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import { invalidateCashierAnalyticsCache } from "@/hooks/use-cashier-analytics";
type ReturnQtyMap = Record<string, number>;
export function ReturnsPage() {
    const token = useAuthStore((s) => s.token);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [returnsEnabled, setReturnsEnabled] = useState(true);
    const [refundPercent, setRefundPercent] = useState(100);
    const [billCatalog, setBillCatalog] = useState<BillRecord[]>([]);
    const [billQuery, setBillQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [bill, setBill] = useState<BillForReturn | null>(null);
    const [billLoading, setBillLoading] = useState(false);
    const [returnQty, setReturnQty] = useState<ReturnQtyMap>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [recent, setRecent] = useState<ReturnRecord[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        void apiGetReturnSettings(token)
            .then((r) => {
            setReturnsEnabled(r.settings.returnsEnabled);
            setRefundPercent(r.settings.returnRefundPercent);
        })
            .finally(() => setSettingsLoading(false));
        void apiFetchReturns(token, 30).then((r) => setRecent(r.returns));
        void apiFetchBills(token, { limit: 200 }).then((r) => setBillCatalog(r.bills));
    }, [token]);
    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (searchRef.current &&
                !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);
    const suggestions = useMemo(() => {
        const q = billQuery.trim().toLowerCase();
        if (!q)
            return billCatalog.slice(0, 8);
        return billCatalog
            .filter((b) => b.billNumber.toLowerCase().includes(q) ||
            b.id.toLowerCase().includes(q))
            .slice(0, 8);
    }, [billCatalog, billQuery]);
    const openBillByNumber = useCallback(async (billNumber: string) => {
        const q = billNumber.trim();
        if (!q)
            return;
        setBillQuery(q);
        setShowSuggestions(false);
        setBillLoading(true);
        setError(null);
        setSuccess(null);
        setBill(null);
        setReturnQty({});
        try {
            const res = await apiFetchBillByNumber(token, q);
            if (!res.found || !res.bill) {
                setError("Bill not found");
                return;
            }
            setBill(res.bill);
            setRefundPercent(res.bill.refundPercent);
            if (!res.bill.hasReturnable) {
                setError("All items on this bill are already returned");
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Lookup failed");
        }
        finally {
            setBillLoading(false);
        }
    }, [token]);
    const pickSuggestion = (b: BillRecord) => {
        void openBillByNumber(b.billNumber);
    };
    const setItemQty = (billItemId: string, qty: number, max: number) => {
        const n = Math.max(0, Math.min(max, qty));
        setReturnQty((prev) => {
            const next = { ...prev };
            if (n === 0)
                delete next[billItemId];
            else
                next[billItemId] = n;
            return next;
        });
    };
    const refundPreview = useMemo(() => {
        if (!bill)
            return 0;
        let sum = 0;
        for (const item of bill.items) {
            const q = returnQty[item.id] ?? 0;
            if (q > 0)
                sum += item.effectiveUnitPrice * q * (refundPercent / 100);
        }
        return sum;
    }, [bill, returnQty, refundPercent]);
    const selectedCount = Object.values(returnQty).reduce((s, n) => s + n, 0);
    const submitReturn = async () => {
        if (!bill)
            return;
        const items = Object.entries(returnQty)
            .filter(([, q]) => q > 0)
            .map(([billItemId, quantity]) => ({ billItemId, quantity }));
        if (items.length === 0) {
            setError("Select items to return");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const { return: created } = await apiCreateReturn(token, {
                billId: bill.id,
                items,
            });
            setSuccess(`Return ${created.returnNumber} — refund ${formatMoney(created.refundAmount)}`);
            setBill(null);
            setBillQuery("");
            setReturnQty({});
            invalidateCashierAnalyticsCache();
            const [list, bills] = await Promise.all([
                apiFetchReturns(token, 30),
                apiFetchBills(token, { limit: 200 }),
            ]);
            setRecent(list.returns);
            setBillCatalog(bills.bills);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Return failed");
        }
        finally {
            setSubmitting(false);
        }
    };
    if (settingsLoading) {
        return (<div className="flex h-full flex-col gap-4 p-1">
        <Skeleton className="h-12 w-full rounded-2xl"/>
        <Skeleton className="h-10 w-full"/>
        <SkeletonRows count={4}/>
      </div>);
    }
    if (!returnsEnabled) {
        return (<div className="flex flex-1 flex-col items-center justify-center text-center">
        <RotateCcw className="mb-3 h-10 w-10 text-neutral-300"/>
        <p className="font-semibold text-neutral-800">Returns are disabled</p>
        <p className="mt-1 text-sm text-neutral-500">
          Admin has turned off returns. Contact your store manager.
        </p>
      </div>);
    }
    return (<div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-4 border-b border-neutral-200/80 bg-neutral-50/95 pb-4 backdrop-blur-sm">
        <p className="text-sm text-neutral-500">
          Refund at {refundPercent}% · search bill ID
        </p>

        <div ref={searchRef} className="relative">
          <div className={cn("flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm", showSuggestions
            ? "border-red-200 ring-2 ring-red-50"
            : "border-neutral-200")}>
            <Search className="h-5 w-5 shrink-0 text-neutral-400"/>
            <input type="search" value={billQuery} onChange={(e) => {
            setBillQuery(e.target.value);
            setShowSuggestions(true);
        }} onFocus={() => setShowSuggestions(true)} onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                void openBillByNumber(billQuery);
            }
            if (e.key === "Escape")
                setShowSuggestions(false);
        }} placeholder="Bill ID e.g. B-20250521-0001" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-neutral-400"/>
            {billQuery.trim() ? (<button type="button" onClick={() => {
                setBillQuery("");
                setBill(null);
                setReturnQty({});
                setError(null);
            }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100" aria-label="Clear">
                <X className="h-4 w-4 text-neutral-400"/>
              </button>) : null}
            <Button type="button" size="sm" disabled={billLoading || !billQuery.trim()} onClick={() => void openBillByNumber(billQuery)} className="h-9 shrink-0 bg-red-600 px-4 hover:bg-red-700">
              Open
            </Button>
          </div>

          {showSuggestions && suggestions.length > 0 && (<ul className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-1 shadow-lg">
              {suggestions.map((b) => (<li key={b.id}>
                  <button type="button" onClick={() => pickSuggestion(b)} className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left hover:bg-red-50">
                    <Receipt className="h-4 w-4 shrink-0 text-red-600"/>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block truncate font-semibold text-neutral-900">
                        {b.billNumber}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatReceiptDate(b.createdAt)} ·{" "}
                        {formatMoney(b.total)}
                      </span>
                    </span>
                  </button>
                </li>))}
            </ul>)}
        </div>

        {error && (<p className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0"/>
            {error}
          </p>)}
        {success && (<p className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0"/>
            {success}
          </p>)}
      </div>

      <div className="scrollbar-modern min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {billLoading && !bill && (<div className="pt-4">
            <SkeletonRows count={3}/>
          </div>)}

        {bill && (<div className="space-y-4 pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-100 pb-3">
              <div className="min-w-0">
                <p className="text-xl font-bold text-neutral-900">
                  {bill.billNumber}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatReceiptDate(bill.createdAt)} · Sold{" "}
                  {formatMoney(bill.total)}
                </p>
              </div>
              <p className="text-lg font-bold text-green-700">
                {refundPercent}% refund
              </p>
            </div>

            <ul className="divide-y divide-neutral-100">
              {bill.items.map((item) => (<li key={item.id} className={cn("flex min-w-0 flex-wrap items-center gap-3 py-3 sm:flex-nowrap", item.returnableQty === 0 && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{item.name}</p>
                    <p className="text-xs text-neutral-500">
                      Paid {formatMoney(item.effectiveUnitPrice)}
                      {item.effectiveUnitPrice < item.unitPrice && (<> <span className="text-neutral-400">(was {formatMoney(item.unitPrice)})</span></>)}
                      {" "}· Sold {item.quantity}
                      {item.returnedQty > 0 && (<> · Returned {item.returnedQty}</>)}
                    </p>
                  </div>
                  {item.returnableQty > 0 ? (<div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => setItemQty(item.id, (returnQty[item.id] ?? 0) - 1, item.returnableQty)} className="rounded-lg border border-neutral-200 p-1.5 hover:bg-neutral-100">
                        <Minus className="h-3.5 w-3.5"/>
                      </button>
                      <span className="min-w-[2ch] text-center font-bold tabular-nums">
                        {returnQty[item.id] ?? 0}
                      </span>
                      <button type="button" onClick={() => setItemQty(item.id, (returnQty[item.id] ?? 0) + 1, item.returnableQty)} className="rounded-lg border border-neutral-200 p-1.5 hover:bg-neutral-100">
                        <Plus className="h-3.5 w-3.5"/>
                      </button>
                      <span className="text-xs text-neutral-400">
                        / {item.returnableQty}
                      </span>
                    </div>) : (<span className="text-xs text-neutral-400">
                      Fully returned
                    </span>)}
                </li>))}
            </ul>

            <div className="sticky bottom-0 border-t border-neutral-200 bg-neutral-50/95 py-4 backdrop-blur-sm">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Items to return</span>
                <span className="font-semibold">{selectedCount}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="font-bold text-neutral-900">Refund</span>
                <span className="text-xl font-bold tabular-nums text-green-700">
                  {formatMoney(refundPreview)}
                </span>
              </div>
              <Button type="button" disabled={submitting ||
                selectedCount === 0 ||
                refundPreview <= 0} className="mt-3 h-11 w-full bg-red-600 font-bold hover:bg-red-700 disabled:opacity-60" onClick={() => void submitReturn()}>
              Process return
              </Button>
            </div>
          </div>)}

        {!bill && !billLoading && (<p className="py-16 text-center text-sm text-neutral-500">
            Search or pick a bill above to start a return
          </p>)}

        {recent.length > 0 && (<div className="mt-6 border-t border-neutral-200 pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
              Recent returns
            </p>
            <ul className="divide-y divide-neutral-100">
              {recent.map((r) => (<li key={r.id} className="flex min-w-0 items-center justify-between gap-2 py-3">
                  <div className="min-w-0 overflow-hidden">
                    <p className="truncate font-semibold text-neutral-900">
                      {r.returnNumber}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      Bill {r.bill.billNumber} ·{" "}
                      {formatReceiptDate(r.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-green-700">
                    {formatMoney(r.refundAmount)}
                  </span>
                </li>))}
            </ul>
          </div>)}
      </div>
    </div>);
}

