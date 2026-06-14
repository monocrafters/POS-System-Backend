"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonReceiptPreview, SkeletonSettingsRows, } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { apiAdminGetReceiptSettings, apiAdminUpdateReceiptSettings, type ReceiptSettings, } from "@/lib/api-client";
import { cacheReceiptSettings, readReceiptSettingsCache, } from "@/lib/admin-settings-cache";
import { invalidateReceiptPhoneCache } from "@/hooks/use-receipt-settings";
import { ThermalReceipt } from "@/components/cashier/thermal-receipt";
import type { ReceiptBillData } from "@/lib/receipt";
const PREVIEW_BILL: ReceiptBillData = {
    billNumber: "PREVIEW-001",
    createdAt: new Date().toISOString(),
    cashierName: "Sample Cashier",
    items: [
        {
            name: "Sample Product",
            quantity: 1,
            unitPrice: 500,
            lineTotal: 500,
        },
    ],
    subtotal: 500,
    discountAmount: 0,
    total: 500,
    itemCount: 1,
};
export function AdminReceiptSettingsPage() {
    const token = useAuthStore((s) => s.token);
    const cached = readReceiptSettingsCache();
    const [settings, setSettings] = useState<ReceiptSettings | null>(cached);
    const [loading, setLoading] = useState(!cached);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const load = useCallback(async () => {
        try {
            const res = await apiAdminGetReceiptSettings(token);
            setSettings(res.settings);
            cacheReceiptSettings(res.settings);
            setError(null);
        }
        catch (err) {
            if (!settings) {
                setError(err instanceof Error ? err.message : "Failed to load");
            }
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    useEffect(() => {
        void load();
    }, [load]);
    const save = async () => {
        if (!settings)
            return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await apiAdminUpdateReceiptSettings(token, {
                receiptPhone: settings.receiptPhone,
            });
            setSettings(res.settings);
            cacheReceiptSettings(res.settings);
            invalidateReceiptPhoneCache();
            setSuccess("Receipt settings saved");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
        }
        finally {
            setSaving(false);
        }
    };
    if (loading && !settings) {
        return (<div className="flex min-h-full w-full flex-col">
        <SkeletonSettingsRows rows={1}/>
        <div className="grid lg:grid-cols-2">
          <div className="space-y-3 px-5 py-5 lg:px-8">
            <Skeleton className="h-4 w-28"/>
            <Skeleton className="h-10 w-full max-w-xs"/>
          </div>
          <SkeletonReceiptPreview />
        </div>
      </div>);
    }
    if (!settings) {
        return (<p className="px-5 py-10 text-sm text-red-600 lg:px-8">{error}</p>);
    }
    return (<div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <p className="text-sm text-neutral-500">
          Phone on printed receipts · preview updates live
        </p>
        <Button type="button" onClick={() => void save()} disabled={saving} className="h-9 gap-2 rounded-lg bg-[#E31837] hover:bg-red-700">
          {saving ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<Save className="h-4 w-4"/>)}
          Save
        </Button>
      </div>

      {(error || success) && (<div className={success
                ? "border-b border-green-100 bg-green-50 px-5 py-2 text-sm text-green-800 lg:px-8"
                : "border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700 lg:px-8"}>
          {success || error}
        </div>)}

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <div className="border-b border-neutral-200 px-5 py-5 lg:border-b-0 lg:border-r lg:px-8 lg:py-6">
          <Label htmlFor="receipt-phone" className="text-sm font-medium">
            Shop phone
          </Label>
          <p className="mt-0.5 text-xs text-neutral-500">
            Leave empty to hide on receipts
          </p>
          <Input id="receipt-phone" type="tel" value={settings.receiptPhone ?? ""} onChange={(e) => setSettings((s) => s ? { ...s, receiptPhone: e.target.value } : s)} placeholder="e.g. 0300 1234567" className="mt-3 max-w-md border-neutral-200"/>
        </div>

        <div className="flex flex-col bg-neutral-50/60">
          <p className="border-b border-neutral-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:px-8">
            Preview
          </p>
          <div className="flex flex-1 justify-center overflow-auto px-4 py-6 lg:px-8">
            <ThermalReceipt bill={PREVIEW_BILL} widthMm={80} shopPhone={settings.receiptPhone}/>
          </div>
        </div>
      </div>
    </div>);
}

