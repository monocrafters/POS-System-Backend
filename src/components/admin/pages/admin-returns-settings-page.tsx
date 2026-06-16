"use client";
import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Loader2, Settings, Trash2 } from "lucide-react";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { apiFetchReturns, apiDeleteReturn, type ReturnRecord } from "@/lib/api-client";
import { formatMoney, formatReceiptDate } from "@/lib/receipt";
import type { AdminSectionId } from "../admin-nav";
interface AdminReturnsPageProps {
    onNavigate?: (id: AdminSectionId) => void;
}
export function AdminReturnsSettingsPage({ onNavigate, }: AdminReturnsPageProps) {
    const token = useAuthStore((s) => s.token);
    const [returns, setReturns] = useState<ReturnRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const loadReturns = useCallback(async () => {
        setLoading(true);
        try {
            const r = await apiFetchReturns(token, 50);
            setReturns(r.returns);
        }
        catch {
            setReturns([]);
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    const deleteReturn = async (r: ReturnRecord) => {
        if (!confirm(`Delete ${r.returnNumber}? Stock will be reduced.`)) return;
        setDeletingId(r.id);
        try {
            await apiDeleteReturn(token, r.id);
            await loadReturns();
        }
        catch (e) {
            alert(e instanceof Error ? e.message : "Delete failed");
        }
        finally {
            setDeletingId(null);
        }
    };
    useEffect(() => {
        void loadReturns();
    }, [loadReturns]);
    return (<div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <p className="text-sm text-neutral-500">
          Return history · policy is configured in Settings
        </p>
        {onNavigate && (<button type="button" onClick={() => onNavigate("settings")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <Settings className="h-4 w-4"/>
            Open Settings
          </button>)}
      </div>

      <div className="mt-0 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-2.5 lg:px-8">
          <RotateCcw className="h-4 w-4 text-[#E31837]"/>
          <span className="text-sm font-medium text-neutral-800">
            Recent returns
          </span>
          {loading && (<Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400"/>)}
        </div>
        {loading ? (<SkeletonRows count={5}/>) : returns.length === 0 ? (<p className="px-5 py-10 text-center text-sm text-neutral-500 lg:px-8">
            No returns yet
          </p>) : (<div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-neutral-50">
                <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3 lg:px-8">Return</th>
                  <th className="px-5 py-3 lg:px-8">Bill</th>
                  <th className="px-5 py-3 lg:px-8">Cashier</th>
                  <th className="px-5 py-3 text-right lg:px-8">Refund</th>
                  <th className="px-5 py-3 text-right lg:px-8"> </th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (<tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                    <td className="px-5 py-3 lg:px-8">
                      <p className="font-medium text-neutral-900">
                        {r.returnNumber}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatReceiptDate(r.createdAt)} · {r.refundPercent}%
                      </p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-700 lg:px-8">
                      {r.bill.billNumber}
                    </td>
                    <td className="px-5 py-3 text-neutral-700 lg:px-8">
                      {r.cashier.fullName}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-green-700 lg:px-8">
                      {formatMoney(r.refundAmount)}
                    </td>
                    <td className="px-5 py-3 text-right lg:px-8">
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={() => void deleteReturn(r)}
                        className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label="Delete return">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
      </div>
    </div>);
}

