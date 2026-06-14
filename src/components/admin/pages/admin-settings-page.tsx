"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Cloud, Download, Trash2, Database, User, Store, RotateCcw, } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonReceiptPreview, SkeletonSettingsRows, } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { apiAdminGetAccount, apiAdminGetShopSettings, apiAdminUpdateAccount, apiAdminUpdateShopSettings, apiGetSyncStatus, apiRunSync, apiGetCloudConfig, apiSaveCloudConfig, apiRemoveCloudConfig, apiPullFromCloud, type ShopSettings, type SyncStatusResponse, type CloudConfigView, } from "@/lib/api-client";
import { cacheShopSettings, readShopSettingsCache, } from "@/lib/admin-settings-cache";
import { invalidateShopSettingsCache } from "@/hooks/use-shop-settings";
import { ThermalReceipt } from "@/components/cashier/thermal-receipt";
import type { ReceiptBillData } from "@/lib/receipt";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
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
type OpenSection = "account" | "cloud" | "shop" | "returns" | null;

export function AdminSettingsPage() {
    const token = useAuthStore((s) => s.token);
    const setAuth = useAuthStore((s) => s.setAuth);
    const remember = useAuthStore((s) => s.remember);
    const cached = readShopSettingsCache();
    const [settings, setSettings] = useState<ShopSettings | null>(cached);
    const [loading, setLoading] = useState(!cached);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [cloudConfig, setCloudConfig] = useState<CloudConfigView | null>(null);
    const [mongoUriInput, setMongoUriInput] = useState("");
    const [shopIdInput, setShopIdInput] = useState("bata-store-01");
    const [openSection, setOpenSection] = useState<OpenSection>(null);
    const [cloudSaving, setCloudSaving] = useState(false);
    const [cloudRemoving, setCloudRemoving] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [cloudMessage, setCloudMessage] = useState<string | null>(null);
    const [accountUsername, setAccountUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [savingAccount, setSavingAccount] = useState(false);
    const [accountError, setAccountError] = useState<string | null>(null);
    const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
    const toggleSection = (section: OpenSection) => {
        setOpenSection((prev) => (prev === section ? null : section));
    };
    const load = useCallback(async () => {
        try {
            const [settingsRes, accountRes, syncRes, cloudRes] = await Promise.all([
                apiAdminGetShopSettings(token),
                apiAdminGetAccount(token),
                apiGetSyncStatus(token).catch(() => null),
                apiGetCloudConfig(token).catch(() => null),
            ]);
            setSettings(settingsRes.settings);
            cacheShopSettings(settingsRes.settings);
            setAccountUsername(accountRes.account.username);
            if (syncRes?.success) {
                setSyncStatus(syncRes.sync);
            }
            if (cloudRes?.success) {
                setCloudConfig(cloudRes.config);
                setShopIdInput(cloudRes.config.shopId);
                if (!cloudRes.config.configured) {
                    setMongoUriInput("");
                }
            }
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
    const refreshSyncStatus = useCallback(async (opts?: {
        showError?: boolean;
    }) => {
        try {
            const res = await apiGetSyncStatus(token);
            setSyncStatus(res.sync);
            if (opts?.showError)
                setSyncError(null);
        }
        catch (err) {
            if (opts?.showError) {
                setSyncError(err instanceof Error ? err.message : "Failed to load backup status");
            }
        }
    }, [token]);
    useEffect(() => {
        void load();
    }, [load]);
    const runBackup = async () => {
        setSyncLoading(true);
        setSyncError(null);
        setCloudMessage(null);
        try {
            const res = await apiRunSync(token);
            if (!res.success && !res.skipped) {
                setSyncError("Cloud backup failed. Please try again.");
            }
            else {
                setCloudMessage(`Backup complete — ${res.pushed} records pushed to cloud.`);
                await refreshSyncStatus();
            }
        }
        catch (err) {
            setSyncError(err instanceof Error ? err.message : "Cloud backup failed. Please try again.");
        }
        finally {
            setSyncLoading(false);
        }
    };
    const saveCloud = async () => {
        if (!mongoUriInput.trim()) {
            setSyncError("Paste your MongoDB Atlas connection string first.");
            return;
        }
        setCloudSaving(true);
        setSyncError(null);
        setCloudMessage(null);
        try {
            const res = await apiSaveCloudConfig(token, {
                mongodbUri: mongoUriInput.trim(),
                shopId: shopIdInput.trim() || undefined,
                syncEnabled: true,
            });
            setCloudConfig(res.config);
            setMongoUriInput("");
            setCloudMessage(res.config.connected
                ? "MongoDB connected — uploading local data to cloud…"
                : `Saved, but connection failed: ${res.config.connectionMessage ?? "check URI"}`);
            if (res.config.connected) {
                await apiRunSync(token).catch(() => null);
                setCloudMessage("MongoDB connected — local data backed up to cloud.");
            }
            await refreshSyncStatus();
        }
        catch (err) {
            setSyncError(err instanceof Error ? err.message : "Failed to save cloud database");
        }
        finally {
            setCloudSaving(false);
        }
    };
    const removeCloud = async () => {
        if (!confirm("Remove cloud database from this PC? Local data stays on this machine."))
            return;
        setCloudRemoving(true);
        setSyncError(null);
        setCloudMessage(null);
        try {
            const res = await apiRemoveCloudConfig(token);
            setCloudConfig(res.config);
            setMongoUriInput("");
            setCloudMessage(res.message);
            await refreshSyncStatus();
        }
        catch (err) {
            setSyncError(err instanceof Error ? err.message : "Failed to remove cloud database");
        }
        finally {
            setCloudRemoving(false);
        }
    };
    const fetchFromCloud = async () => {
        if (!confirm("Fetch latest backup from cloud into this PC? This replaces local data with the cloud snapshot."))
            return;
        setFetchLoading(true);
        setSyncError(null);
        setCloudMessage(null);
        try {
            const res = await apiPullFromCloud(token);
            if (res.skipped) {
                setCloudMessage(res.reason ?? "Cloud not configured.");
            }
            else if (!res.success) {
                setSyncError(res.error ?? "Fetch failed");
            }
            else {
                setCloudMessage(`Fetched from cloud — ${res.pulled} records restored. Restart billing if products look old.`);
                await refreshSyncStatus();
            }
        }
        catch (err) {
            setSyncError(err instanceof Error ? err.message : "Fetch from cloud failed");
        }
        finally {
            setFetchLoading(false);
        }
    };
    const save = async () => {
        if (!settings)
            return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await apiAdminUpdateShopSettings(token, settings);
            setSettings(res.settings);
            cacheShopSettings(res.settings);
            invalidateShopSettingsCache();
            setSuccess("Settings saved. Store name and receipt details update across the app.");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
        }
        finally {
            setSaving(false);
        }
    };
    const saveAccount = async () => {
        setAccountError(null);
        setAccountSuccess(null);
        if (!currentPassword.trim()) {
            setAccountError("Enter your current password to confirm changes");
            return;
        }
        if (newPassword && newPassword !== confirmPassword) {
            setAccountError("New passwords do not match");
            return;
        }
        if (newPassword && newPassword.length < 6) {
            setAccountError("New password must be at least 6 characters");
            return;
        }
        setSavingAccount(true);
        try {
            const res = await apiAdminUpdateAccount(token, {
                currentPassword,
                username: accountUsername.trim().toLowerCase(),
                newPassword: newPassword || undefined,
                confirmPassword: confirmPassword || undefined,
            });
            setAuth(res.user, res.token, remember);
            setAccountUsername(res.user.username);
            setNewPassword("");
            setConfirmPassword("");
            setCurrentPassword("");
            setAccountSuccess("Login updated. Use your new username/password next time you sign in.");
        }
        catch (err) {
            setAccountError(err instanceof Error ? err.message : "Update failed");
        }
        finally {
            setSavingAccount(false);
        }
    };
    if (loading && !settings) {
        return (<div className="flex min-h-full w-full flex-col">
        <SkeletonSettingsRows rows={3}/>
        <Skeleton className="m-5 h-48 lg:mx-8"/>
      </div>);
    }
    if (!settings) {
        return (<p className="px-5 py-10 text-sm text-red-600 lg:px-8">{error}</p>);
    }
    return (<div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <p className="text-sm text-neutral-500">
          Store name, receipts, and return policy — applies everywhere in the
          system
        </p>
        <Button type="button" onClick={() => void save()} disabled={saving} className="h-9 gap-2 rounded-lg bg-[#E31837] hover:bg-red-700">
          {saving ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<Save className="h-4 w-4"/>)}
          Save all
        </Button>
      </div>

      {(error || success) && (<div className={cn("flex items-center gap-2 border-b px-5 py-2 text-sm lg:px-8", success
                ? "border-green-100 bg-green-50 text-green-800"
                : "border-red-100 bg-red-50 text-red-700")}>
          {success ? (<CheckCircle2 className="h-4 w-4 shrink-0"/>) : (<AlertCircle className="h-4 w-4 shrink-0"/>)}
          {success || error}
        </div>)}

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <div className="border-b border-neutral-200 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="space-y-3 p-5 lg:p-8">
          <CollapsibleSection
            title="Account"
            icon={User}
            open={openSection === "account"}
            onToggle={() => toggleSection("account")}>
            <p className="mb-4 text-xs text-neutral-500">Change your sign-in username and password</p>
            {(accountError || accountSuccess) && (<div className={cn("mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm", accountSuccess
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700")}>
                {accountSuccess ? (<CheckCircle2 className="h-4 w-4 shrink-0"/>) : (<AlertCircle className="h-4 w-4 shrink-0"/>)}
                {accountSuccess || accountError}
              </div>)}
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-username" className="text-sm font-medium">Username</Label>
                <Input id="admin-username" value={accountUsername} onChange={(e) => setAccountUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="e.g. admin" className="mt-2 max-w-md border-neutral-200 lowercase"/>
              </div>
              <div>
                <Label htmlFor="new-password" className="text-sm font-medium">New password</Label>
                <p className="mt-0.5 text-xs text-neutral-500">Leave blank to keep your current password</p>
                <div className="relative mt-2 max-w-md">
                  <Input id="new-password" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" className="border-neutral-200 pr-10"/>
                  <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600" aria-label={showNewPassword ? "Hide password" : "Show password"}>
                    {showNewPassword ? (<EyeOff className="h-4 w-4"/>) : (<Eye className="h-4 w-4"/>)}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password</Label>
                <Input id="confirm-password" type={showNewPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2 max-w-md border-neutral-200"/>
              </div>
              <div>
                <Label htmlFor="current-password" className="text-sm font-medium">Current password</Label>
                <p className="mt-0.5 text-xs text-neutral-500">Required to save username or password changes</p>
                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-2 max-w-md border-neutral-200"/>
              </div>
              <Button type="button" variant="outline" disabled={savingAccount} onClick={() => void saveAccount()} className="h-9 gap-2">
                {savingAccount ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<Save className="h-4 w-4"/>)}
                Update login
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Cloud backup (MongoDB)"
            icon={Database}
            open={openSection === "cloud"}
            onToggle={() => toggleSection("cloud")}>
            <p className="mb-4 text-xs text-neutral-500">
              MongoDB Atlas cloud backup. Mobile app uses the same config from this PC.
            </p>
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 text-sm">
              {cloudConfig?.configured ? (<div className="space-y-1 text-xs text-neutral-600">
                  <p><span className="font-semibold text-neutral-800">Connected:</span> {cloudConfig.connected ? "Yes" : "No"}</p>
                  <p><span className="font-semibold text-neutral-800">URI:</span> {cloudConfig.mongodbUriMasked}</p>
                  <p><span className="font-semibold text-neutral-800">Shop ID:</span> {cloudConfig.shopId}</p>
                  {cloudConfig.database && (<p><span className="font-semibold text-neutral-800">Database:</span> {cloudConfig.database}</p>)}
                  {!cloudConfig.connected && cloudConfig.connectionMessage && (<p className="text-red-600">{cloudConfig.connectionMessage}</p>)}
                </div>) : (<p className="text-xs text-neutral-500">No cloud database yet. Paste MongoDB URI below.</p>)}

              <div>
                <Label htmlFor="mongo-uri" className="text-xs font-medium">MongoDB connection string</Label>
                <Input
                  id="mongo-uri"
                  value={mongoUriInput}
                  onChange={(e) => setMongoUriInput(e.target.value)}
                  placeholder="mongodb+srv://user:pass@cluster.mongodb.net/bata-pos?appName=Cluster0"
                  className="mt-1.5 font-mono text-xs"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="shop-id" className="text-xs font-medium">Shop ID</Label>
                <Input id="shop-id" value={shopIdInput} onChange={(e) => setShopIdInput(e.target.value)} placeholder="bata-store-01" className="mt-1.5 max-w-xs text-sm"/>
                <p className="mt-1 text-[10px] text-neutral-500">Same ID on all PCs and mobile for one shop&apos;s backups.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={cloudSaving} onClick={() => void saveCloud()} className="h-8 gap-1.5 bg-[#E31837] hover:bg-red-700">
                  {cloudSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Cloud className="h-3.5 w-3.5"/>}
                  {cloudConfig?.configured ? "Update connection" : "Add MongoDB"}
                </Button>
                {cloudConfig?.configured && (<Button type="button" size="sm" variant="outline" disabled={cloudRemoving} onClick={() => void removeCloud()} className="h-8 gap-1.5 text-red-600">
                    {cloudRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5"/>}
                    Remove cloud DB
                  </Button>)}
              </div>

              {syncStatus && cloudConfig?.configured && (<div className="space-y-2 border-t border-neutral-200 pt-3 text-xs text-neutral-600">
                  <p><span className="font-semibold text-neutral-800">Last backup:</span> {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : "Never"}</p>
                  <p><span className="font-semibold text-neutral-800">Pending:</span> {syncStatus.pendingRecords ?? 0} / {syncStatus.totalRecords ?? 0}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-[#E31837]" style={{ width: `${syncStatus.percentBackedUp ?? 0}%` }}/>
                  </div>
                </div>)}

              {cloudMessage && (<p className="text-xs text-green-700">{cloudMessage}</p>)}
              {syncError && (<p className="text-xs text-red-600">{syncError}</p>)}

              <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
                <Button type="button" size="sm" variant="outline" disabled={syncLoading || !cloudConfig?.configured} onClick={() => void runBackup()} className="h-8 gap-1.5">
                  {syncLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Cloud className="h-3.5 w-3.5"/>}
                  Push backup to cloud
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={fetchLoading || !cloudConfig?.configured} onClick={() => void fetchFromCloud()} className="h-8 gap-1.5">
                  {fetchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Download className="h-3.5 w-3.5"/>}
                  Fetch from cloud
                </Button>
                <button type="button" onClick={() => void refreshSyncStatus({ showError: true })} className="text-[11px] font-medium text-neutral-500 underline-offset-2 hover:underline">
                  Refresh status
                </button>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Shop & Receipt"
            icon={Store}
            open={openSection === "shop"}
            onToggle={() => toggleSection("shop")}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="shop-name" className="text-sm font-medium">Store name</Label>
                <Input id="shop-name" value={settings.shopName} onChange={(e) => setSettings((s) => s ? { ...s, shopName: e.target.value } : s)} placeholder="e.g. Bata POS" className="mt-2 max-w-md border-neutral-200"/>
              </div>
              <div>
                <Label htmlFor="shop-tagline" className="text-sm font-medium">Subtitle (receipt & login)</Label>
                <Input id="shop-tagline" value={settings.shopTagline} onChange={(e) => setSettings((s) => s ? { ...s, shopTagline: e.target.value } : s)} placeholder="e.g. Retail Store" className="mt-2 max-w-md border-neutral-200"/>
              </div>
              <div>
                <Label htmlFor="receipt-phone" className="text-sm font-medium">Shop phone (receipt)</Label>
                <p className="mt-0.5 text-xs text-neutral-500">Leave empty to hide on receipts</p>
                <Input id="receipt-phone" type="tel" value={settings.receiptPhone ?? ""} onChange={(e) => setSettings((s) => s ? { ...s, receiptPhone: e.target.value } : s)} placeholder="e.g. 0300 1234567" className="mt-2 max-w-md border-neutral-200"/>
              </div>
              <Button type="button" onClick={() => void save()} disabled={saving} className="h-9 gap-2 bg-[#E31837] hover:bg-red-700">
                {saving ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<Save className="h-4 w-4"/>)}
                Save shop settings
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Returns policy"
            icon={RotateCcw}
            open={openSection === "returns"}
            onToggle={() => toggleSection("returns")}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Returns enabled</p>
                  <p className="text-xs text-neutral-500">Cashiers can process returns when on</p>
                </div>
                <button type="button" role="switch" aria-checked={settings.returnsEnabled} onClick={() => setSettings((s) => s ? { ...s, returnsEnabled: !s.returnsEnabled } : s)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", settings.returnsEnabled ? "bg-[#E31837]" : "bg-neutral-300")}>
                  <span className={cn("absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform", settings.returnsEnabled && "translate-x-5")}/>
                </button>
              </div>
              <div>
                <Label htmlFor="refund-pct" className="text-sm font-medium">Refund percentage (%)</Label>
                <p className="mt-0.5 text-xs text-neutral-500">% of item price returned to customer</p>
                <Input id="refund-pct" type="number" min="0" max="100" step="1" value={settings.returnRefundPercent} onChange={(e) => setSettings((s) => s
            ? { ...s, returnRefundPercent: Number(e.target.value) || 0 }
            : s)} className="mt-2 h-9 w-24 border-neutral-200"/>
                <p className="mt-2 text-xs text-neutral-500">
                  e.g. Rs 1,000 at {settings.returnRefundPercent}% ={" "}
                  <span className="font-semibold text-neutral-800">
                    {formatMoney((1000 * settings.returnRefundPercent) / 100)}
                  </span>
                </p>
              </div>
              <Button type="button" onClick={() => void save()} disabled={saving} variant="outline" className="h-9 gap-2">
                {saving ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<Save className="h-4 w-4"/>)}
                Save returns settings
              </Button>
            </div>
          </CollapsibleSection>
        </div>
        </div>

        <div className="flex flex-col bg-neutral-50/60">
          <p className="border-b border-neutral-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:px-8">
            Receipt preview
          </p>
          <div className="flex flex-1 justify-center overflow-auto px-4 py-6 lg:px-8">
            <ThermalReceipt bill={PREVIEW_BILL} widthMm={80} shopName={settings.shopName} shopTagline={settings.shopTagline} shopPhone={settings.receiptPhone}/>
          </div>
        </div>
      </div>
    </div>);
}

