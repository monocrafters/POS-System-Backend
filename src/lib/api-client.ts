import type { ApiError, LoginResponse } from "@/types/auth";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { ReceiptBillData } from "@/lib/receipt";
function okBody<T>(data: unknown): T {
    return data as T;
}
export interface StaffMember {
    id: string;
    username: string;
    fullName: string;
    role: "ADMIN" | "CASHIER";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface StaffListResponse {
    success: true;
    storeAdmin: StaffMember | null;
    cashiers: StaffMember[];
    cashierCount: number;
    canRegisterAdmin: boolean;
}
export interface ProductBarcodeRow {
    id: string;
    barcode: string;
    createdAt: string;
}
export interface ProductRecord {
    id: string;
    name: string;
    price: number;
    purchaseCost: number;
    stock: number;
    isActive: boolean;
    barcodes: ProductBarcodeRow[];
    createdAt: string;
    updatedAt: string;
}
export interface SearchResponse {
    success: true;
    query: string;
    cashiers: StaffMember[];
    products: {
        id: string;
        name: string;
        sku?: string;
    }[];
    bills: {
        id: string;
        billNumber: string;
        label: string;
    }[];
    totalResults: number;
}
export interface PeriodBreakdown {
    grossSales: number;
    discounts: number;
    refunds: number;
    netRevenue: number;
    costOfGoods: number;
    grossProfit: number;
    profitMargin: number;
    bills: number;
    itemsSold: number;
    returns: number;
    avgBill: number;
}
export interface AdminAnalytics {
    today: PeriodBreakdown;
    yesterday: PeriodBreakdown;
    periods: {
        day: PeriodBreakdown;
        week: PeriodBreakdown;
        month: PeriodBreakdown;
        year: PeriodBreakdown;
    };
    allTime: {
        sales: number;
        bills: number;
        netRevenue: number;
        grossProfit: number;
        avgBill: number;
        refunds: number;
    };
    series: {
        day: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
        week: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
        month: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
        year: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
    };
    topProductsByPeriod: {
        day: {
            name: string;
            quantity: number;
            revenue: number;
            profit: number;
        }[];
        week: {
            name: string;
            quantity: number;
            revenue: number;
            profit: number;
        }[];
        month: {
            name: string;
            quantity: number;
            revenue: number;
            profit: number;
        }[];
        year: {
            name: string;
            quantity: number;
            revenue: number;
            profit: number;
        }[];
    };
    topCashiers: {
        name: string;
        sales: number;
        bills: number;
    }[];
    recentBills: {
        id: string;
        billNumber: string;
        total: number;
        itemCount: number;
        cashierName: string;
        createdAt: string;
    }[];
}
export type ExpensePeriod = "day" | "week" | "month" | "year" | "all";
export interface ExpenseRecord {
    id: string;
    title: string;
    amount: number;
    category: string;
    categoryLabel: string;
    customCategory: string | null;
    note: string | null;
    expenseDate: string;
    payFrequency: string | null;
    payFrequencyLabel: string | null;
    recurringExpenseId: string | null;
    createdAt: string;
}
export interface RecurringExpenseRecord {
    id: string;
    title: string;
    amount: number;
    category: string;
    categoryLabel: string;
    customCategory: string | null;
    payFrequency: string;
    payFrequencyLabel: string;
    nextDueDate: string;
    remindDaysBefore: number;
    note: string | null;
    isActive: boolean;
    due: {
        status: "overdue" | "due_soon" | "upcoming" | "ok";
        daysUntil: number;
        label: string;
    };
}
export interface ExpensesSummary {
    total: number;
    count: number;
    byCategory: {
        category: string;
        label: string;
        total: number;
        count: number;
    }[];
}
export interface StockAnalyticsRow {
    id: string;
    name: string;
    barcode: string;
    price: number;
    stock: number;
    status: "out" | "low" | "ok";
    sold7d: number;
    sold30d: number;
    avgPerDay: number;
    daysLeft: number | null;
    targetStock: number;
    orderQty: number;
}
export interface AdminStockAnalytics {
    summary: {
        total: number;
        out: number;
        low: number;
        ok: number;
        unitsToOrder: number;
    };
    products: StockAnalyticsRow[];
}
function authHeaders(token: string | null): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token)
        headers["Authorization"] = `Bearer ${token}`;
    return headers;
}
export async function apiLogin(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.toLowerCase().trim(), password }),
    });
    const data = await parseJsonResponse<LoginResponse | ApiError>(res);
    if (!res.ok || !("token" in data)) {
        throw new Error("message" in data ? data.message : "Login failed");
    }
    return data;
}
export async function apiFetchStaff(token: string | null): Promise<StaffListResponse> {
    const res = await fetch("/api/staff", { headers: authHeaders(token) });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load staff");
    }
    return okBody<StaffListResponse>(data);
}
export async function apiRegisterCashier(token: string | null, body: {
    username: string;
    password: string;
    fullName: string;
}): Promise<{
    success: true;
    message: string;
    user: StaffMember;
}> {
    const res = await fetch("/api/staff", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
            ...body,
            username: body.username.toLowerCase().trim(),
        }),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Registration failed");
    }
    return okBody<{
        success: true;
        message: string;
        user: StaffMember;
    }>(data);
}
export async function apiUpdateCashier(token: string | null, id: string, body: {
    username?: string;
    fullName?: string;
    password?: string;
}): Promise<{
    success: true;
    message: string;
    user: StaffMember;
}> {
    const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({
            ...body,
            username: body.username?.toLowerCase().trim(),
        }),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Update failed");
    }
    return okBody<{
        success: true;
        message: string;
        user: StaffMember;
    }>(data);
}
export async function apiDeleteCashier(token: string | null, id: string): Promise<{
    success: true;
    message: string;
}> {
    const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Delete failed");
    }
    return okBody<{
        success: true;
        message: string;
    }>(data);
}
export async function apiFetchProducts(token: string | null): Promise<{
    success: true;
    products: ProductRecord[];
}> {
    const res = await fetch("/api/products", { headers: authHeaders(token) });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load products");
    }
    return okBody<{
        success: true;
        products: ProductRecord[];
    }>(data);
}
export async function apiCreateProduct(token: string | null, body: {
    name: string;
    price: number;
    purchaseCost?: number;
    stock: number;
    barcodes: string[];
}): Promise<{
    success: true;
    product: ProductRecord;
}> {
    const res = await fetch("/api/products", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Create failed");
    }
    return okBody<{
        success: true;
        product: ProductRecord;
    }>(data);
}
export interface CloudConfigView {
    configured: boolean;
    provider?: string;
    postgresUriMasked?: string | null;
    shopId: string;
    syncEnabled: boolean;
    connected: boolean;
    connectionMessage?: string | null;
    database?: string | null;
}
export async function apiGetCloudConfig(token: string | null): Promise<{
    success: true;
    config: CloudConfigView;
}> {
    const res = await fetch("/api/admin/cloud-config", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load cloud settings");
    }
    return okBody<{
        success: true;
        config: CloudConfigView;
    }>(data);
}
export async function apiSaveCloudConfig(token: string | null, body: {
    mongodbUri: string;
    shopId?: string;
    syncEnabled?: boolean;
}): Promise<{
    success: true;
    config: CloudConfigView;
}> {
    const res = await fetch("/api/admin/cloud-config", {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to save cloud settings");
    }
    return okBody<{
        success: true;
        config: CloudConfigView;
    }>(data);
}
export async function apiRemoveCloudConfig(token: string | null): Promise<{
    success: true;
    message: string;
    config: CloudConfigView;
}> {
    const res = await fetch("/api/admin/cloud-config", {
        method: "DELETE",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to remove cloud database");
    }
    return okBody<{
        success: true;
        message: string;
        config: CloudConfigView;
    }>(data);
}
export async function apiPullFromCloud(token: string | null): Promise<{
    success: boolean;
    skipped?: boolean;
    pulled: number;
    pushed: number;
    reason?: string;
    error?: string;
}> {
    const res = await fetch("/api/sync/pull", {
        method: "POST",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Fetch from cloud failed");
    }
    return okBody<{
        success: boolean;
        skipped?: boolean;
        pulled: number;
        pushed: number;
        reason?: string;
        error?: string;
    }>(data);
}
export async function apiUpdateProduct(token: string | null, id: string, body: {
    name: string;
    price: number;
    purchaseCost?: number;
    stock: number;
    barcodes: string[];
}): Promise<{
    success: true;
    product: ProductRecord | null;
}> {
    const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Update failed");
    }
    return okBody<{
        success: true;
        product: ProductRecord | null;
    }>(data);
}
export async function apiDeleteProduct(token: string | null, id: string): Promise<{
    success: true;
    message: string;
}> {
    const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Delete failed");
    }
    return okBody<{
        success: true;
        message: string;
    }>(data);
}
export async function apiLookupProductByBarcode(token: string | null, code: string): Promise<{
    success: true;
    found: boolean;
    product: ProductRecord | null;
}> {
    const q = encodeURIComponent(code.trim());
    const res = await fetch(`/api/products/lookup?code=${q}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Lookup failed");
    }
    return okBody<{
        success: true;
        found: boolean;
        product: ProductRecord | null;
    }>(data);
}
export interface PosProduct {
    id: string;
    name: string;
    price: number;
    stock: number;
    barcode: string;
}
export interface BillItemRow {
    id: string;
    barcode: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineDiscount: number;
    lineTotal: number;
}
export interface BillRecord {
    id: string;
    billNumber: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    itemCount: number;
    status: string;
    createdAt: string;
    cashier: {
        id: string;
        fullName: string;
        username: string;
    };
    items: BillItemRow[];
}
export async function apiPosSearch(token: string | null, query: string): Promise<{
    success: true;
    products: PosProduct[];
}> {
    const q = encodeURIComponent(query.trim());
    const res = await fetch(`/api/pos/search?q=${q}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Search failed");
    }
    return okBody<{
        success: true;
        products: PosProduct[];
    }>(data);
}
export async function apiPosLookup(token: string | null, code: string): Promise<{
    success: true;
    found: boolean;
    product: PosProduct | null;
}> {
    const q = encodeURIComponent(code.trim());
    const res = await fetch(`/api/pos/lookup?code=${q}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Lookup failed");
    }
    return okBody<{
        success: true;
        found: boolean;
        product: PosProduct | null;
    }>(data);
}
export async function apiCreateBill(token: string | null, payload: {
    items: {
        productId: string;
        quantity: number;
        unitPrice?: number;
        name?: string;
        lineDiscount?: number;
    }[];
    discountAmount?: number;
}): Promise<{
    success: true;
    bill: BillRecord;
}> {
    const res = await fetch("/api/pos/bills", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Sale failed");
    }
    return okBody<{
        success: true;
        bill: BillRecord;
    }>(data);
}
export type BillListPeriod = "day" | "week" | "month" | "year";
export async function apiFetchBills(token: string | null, options?: {
    limit?: number;
    q?: string;
    period?: BillListPeriod;
    cashierId?: string;
    from?: string;
    to?: string;
}): Promise<{
    success: true;
    bills: BillRecord[];
}> {
    const limit = options?.limit ?? 50;
    const params = new URLSearchParams({ limit: String(limit) });
    if (options?.q?.trim())
        params.set("q", options.q.trim());
    if (options?.period)
        params.set("period", options.period);
    if (options?.cashierId)
        params.set("cashierId", options.cashierId);
    if (options?.from)
        params.set("from", options.from);
    if (options?.to)
        params.set("to", options.to);
    const res = await fetch(`/api/pos/bills?${params}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load bills");
    }
    return okBody<{
        success: true;
        bills: BillRecord[];
    }>(data);
}
export async function apiFetchBill(token: string | null, id: string): Promise<{
    success: true;
    bill: BillRecord;
}> {
    const res = await fetch(`/api/pos/bills/${id}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Bill not found");
    }
    return okBody<{
        success: true;
        bill: BillRecord;
    }>(data);
}
export async function apiDeleteBill(token: string | null, id: string): Promise<{
    success: true;
    message: string;
}> {
    const res = await fetch(`/api/pos/bills/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to delete bill");
    }
    return okBody<{
        success: true;
        message: string;
    }>(data);
}
export function billToReceiptData(bill: BillRecord): ReceiptBillData {
    return {
        billNumber: bill.billNumber,
        createdAt: bill.createdAt,
        cashierName: bill.cashier.fullName,
        items: bill.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineDiscount: i.lineDiscount ?? 0,
            lineTotal: i.lineTotal,
        })),
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount ?? 0,
        total: bill.total,
        itemCount: bill.itemCount,
    };
}
export interface ReturnSettings {
    returnsEnabled: boolean;
    returnRefundPercent: number;
}
export interface ShopSettings {
    shopName: string;
    shopTagline: string;
    receiptPhone: string | null;
    returnsEnabled: boolean;
    returnRefundPercent: number;
}
export interface ShopBranding {
    shopName: string;
    shopTagline: string;
}
export interface ReceiptSettings {
    shopName: string;
    shopTagline: string;
    receiptPhone: string | null;
}
export interface BillForReturnItem {
    id: string;
    productId: string;
    barcode: string;
    name: string;
    unitPrice: number;
    effectiveUnitPrice: number;
    quantity: number;
    lineTotal: number;
    returnedQty: number;
    returnableQty: number;
}
export interface BillForReturn {
    id: string;
    billNumber: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    itemCount: number;
    createdAt: string;
    items: BillForReturnItem[];
    hasReturnable: boolean;
    refundPercent: number;
}
export interface ReturnRecord {
    id: string;
    returnNumber: string;
    billId: string;
    refundAmount: number;
    refundPercent: number;
    itemCount: number;
    createdAt: string;
    bill: {
        billNumber: string;
    };
    cashier: {
        id: string;
        fullName: string;
        username: string;
    };
    items: {
        id: string;
        name: string;
        barcode: string;
        quantity: number;
        lineRefund: number;
    }[];
}
export interface SyncStatusResponse {
    configured: boolean;
    online: boolean;
    lastSyncAt: string | null;
    lastStatus: string;
    lastError: string | null;
    recordsPulled: number;
    recordsPushed: number;
    totalRecords: number;
    pendingRecords: number;
    percentBackedUp: number;
    cloudRecords?: number;
}
export async function apiGetSyncStatus(token: string | null): Promise<{
    success: true;
    sync: SyncStatusResponse;
}> {
    const res = await fetch("/api/sync/status", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load backup status");
    }
    return okBody<{
        success: true;
        sync: SyncStatusResponse;
    }>(data);
}
export async function apiRunSync(token: string | null): Promise<{
    success: boolean;
    skipped?: boolean;
    pulled: number;
    pushed: number;
}> {
    const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Cloud backup failed");
    }
    return okBody<{
        success: boolean;
        skipped?: boolean;
        pulled: number;
        pushed: number;
    }>(data);
}
export async function apiGetReturnSettings(token: string | null): Promise<{
    success: true;
    settings: ReturnSettings;
}> {
    const res = await fetch("/api/settings/returns", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load settings");
    }
    return okBody<{
        success: true;
        settings: ReturnSettings;
    }>(data);
}
export async function apiAdminGetReturnSettings(token: string | null): Promise<{
    success: true;
    settings: ReturnSettings;
}> {
    const res = await fetch("/api/admin/return-settings", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load settings");
    }
    return okBody<{
        success: true;
        settings: ReturnSettings;
    }>(data);
}
export async function apiAdminUpdateReturnSettings(token: string | null, body: Partial<ReturnSettings>): Promise<{
    success: true;
    settings: ReturnSettings;
}> {
    const res = await fetch("/api/admin/return-settings", {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to save settings");
    }
    return okBody<{
        success: true;
        settings: ReturnSettings;
    }>(data);
}
export async function apiGetShopBranding(): Promise<{
    success: true;
    branding: ShopBranding;
}> {
    const res = await fetch("/api/settings/branding");
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load branding");
    }
    return okBody<{
        success: true;
        branding: ShopBranding;
    }>(data);
}
export async function apiGetShopSettings(token: string | null): Promise<{
    success: true;
    settings: ShopSettings;
}> {
    const res = await fetch("/api/settings/shop", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load shop settings");
    }
    return okBody<{
        success: true;
        settings: ShopSettings;
    }>(data);
}
export async function apiAdminGetShopSettings(token: string | null): Promise<{
    success: true;
    settings: ShopSettings;
}> {
    const res = await fetch("/api/admin/shop-settings", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load settings");
    }
    return okBody<{
        success: true;
        settings: ShopSettings;
    }>(data);
}
export async function apiAdminGetAccount(token: string | null): Promise<{
    success: true;
    account: {
        username: string;
        fullName: string;
    };
}> {
    const res = await fetch("/api/admin/account", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load account");
    }
    return okBody<{
        success: true;
        account: {
            username: string;
            fullName: string;
        };
    }>(data);
}
export async function apiAdminUpdateAccount(token: string | null, body: {
    currentPassword: string;
    username: string;
    newPassword?: string;
    confirmPassword?: string;
}): Promise<{
    success: true;
    message: string;
    token: string;
    user: StaffMember;
}> {
    const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to update account");
    }
    return okBody<{
        success: true;
        message: string;
        token: string;
        user: StaffMember;
    }>(data);
}
export async function apiAdminUpdateShopSettings(token: string | null, body: Partial<ShopSettings>): Promise<{
    success: true;
    settings: ShopSettings;
}> {
    const res = await fetch("/api/admin/shop-settings", {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to save settings");
    }
    return okBody<{
        success: true;
        settings: ShopSettings;
    }>(data);
}
export async function apiGetReceiptSettings(token: string | null): Promise<{
    success: true;
    settings: ReceiptSettings;
}> {
    const res = await apiGetShopSettings(token);
    return {
        success: true,
        settings: {
            shopName: res.settings.shopName,
            shopTagline: res.settings.shopTagline,
            receiptPhone: res.settings.receiptPhone,
        },
    };
}
export async function apiAdminGetReceiptSettings(token: string | null): Promise<{
    success: true;
    settings: ReceiptSettings;
}> {
    return apiGetReceiptSettings(token);
}
export async function apiAdminUpdateReceiptSettings(token: string | null, body: Partial<ReceiptSettings>): Promise<{
    success: true;
    settings: ReceiptSettings;
}> {
    const res = await apiAdminUpdateShopSettings(token, body);
    return {
        success: true,
        settings: {
            shopName: res.settings.shopName,
            shopTagline: res.settings.shopTagline,
            receiptPhone: res.settings.receiptPhone,
        },
    };
}
export async function apiFetchBillByNumber(token: string | null, billNumber: string): Promise<{
    success: true;
    found: boolean;
    bill: BillForReturn | null;
}> {
    const q = encodeURIComponent(billNumber.trim());
    const res = await fetch(`/api/pos/bills/by-number?billNumber=${q}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Bill lookup failed");
    }
    return okBody<{
        success: true;
        found: boolean;
        bill: BillForReturn | null;
    }>(data);
}
export async function apiCreateReturn(token: string | null, body: {
    billId: string;
    items: {
        billItemId: string;
        quantity: number;
    }[];
}): Promise<{
    success: true;
    return: ReturnRecord;
}> {
    const res = await fetch("/api/pos/returns", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Return failed");
    }
    return okBody<{
        success: true;
        return: ReturnRecord;
    }>(data);
}
export interface CashierAnalytics {
    today: {
        sales: number;
        bills: number;
        items: number;
        refunds: number;
        returnCount: number;
        netRevenue: number;
    };
    allTime: {
        sales: number;
        bills: number;
        items: number;
        refunds: number;
        returnCount: number;
        netRevenue: number;
        avgBill: number;
    };
    last7Days: {
        date: string;
        label: string;
        sales: number;
        bills: number;
    }[];
    series: {
        day: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
        week: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
        month: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
        year: {
            date: string;
            label: string;
            sales: number;
            bills: number;
        }[];
    };
    topProducts: {
        name: string;
        quantity: number;
        revenue: number;
    }[];
    recentTodayBills: {
        id: string;
        billNumber: string;
        total: number;
        itemCount: number;
        createdAt: string;
    }[];
}
export async function apiFetchCashierAnalytics(token: string | null): Promise<{
    success: true;
    analytics: CashierAnalytics;
}> {
    const res = await fetch("/api/pos/analytics", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load analytics");
    }
    return okBody<{
        success: true;
        analytics: CashierAnalytics;
    }>(data);
}
export interface CashierStockItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    barcode: string;
    status: "ok" | "low" | "out";
}
export interface CashierStockSummary {
    total: number;
    out: number;
    low: number;
    inStock: number;
}
export async function apiFetchCashierStock(token: string | null): Promise<{
    success: true;
    products: CashierStockItem[];
    summary: CashierStockSummary;
}> {
    const res = await fetch("/api/pos/stock", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load stock");
    }
    return okBody<{
        success: true;
        products: CashierStockItem[];
        summary: CashierStockSummary;
    }>(data);
}
export async function apiFetchReturns(token: string | null, limit = 40): Promise<{
    success: true;
    returns: ReturnRecord[];
}> {
    const res = await fetch(`/api/pos/returns?limit=${limit}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load returns");
    }
    return okBody<{
        success: true;
        returns: ReturnRecord[];
    }>(data);
}

export async function apiDeleteReturn(token: string | null, id: string): Promise<{
    success: true;
    message: string;
}> {
    const res = await fetch(`/api/pos/returns/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to delete return");
    }
    return okBody<{ success: true; message: string }>(data);
}
export async function apiSearch(token: string | null, query: string): Promise<SearchResponse> {
    const q = encodeURIComponent(query.trim().toLowerCase());
    const res = await fetch(`/api/search?q=${q}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Search failed");
    }
    return okBody<SearchResponse>(data);
}
export async function apiAdminAnalytics(token: string | null): Promise<{
    success: true;
    analytics: AdminAnalytics;
}> {
    const res = await fetch("/api/admin/analytics", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load analytics");
    }
    return okBody<{
        success: true;
        analytics: AdminAnalytics;
    }>(data);
}
export async function apiAdminStockAnalytics(token: string | null): Promise<{
    success: true;
    summary: AdminStockAnalytics["summary"];
    products: StockAnalyticsRow[];
}> {
    const res = await fetch("/api/admin/stock-analytics", {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load stock");
    }
    return okBody<{
        success: true;
        summary: AdminStockAnalytics["summary"];
        products: StockAnalyticsRow[];
    }>(data);
}
export async function apiAdminExpenses(token: string | null, period: ExpensePeriod = "month"): Promise<{
    success: true;
    period: ExpensePeriod;
    expenses: ExpenseRecord[];
    summary: ExpensesSummary;
    recurring: RecurringExpenseRecord[];
    reminders: RecurringExpenseRecord[];
}> {
    const res = await fetch(`/api/admin/expenses?period=${period}`, {
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to load expenses");
    }
    return okBody<{
        success: true;
        period: ExpensePeriod;
        expenses: ExpenseRecord[];
        summary: ExpensesSummary;
        recurring: RecurringExpenseRecord[];
        reminders: RecurringExpenseRecord[];
    }>(data);
}
export async function apiCreateExpense(token: string | null, body: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    note?: string | null;
    expenseDate?: string;
    payFrequency?: string;
    nextDueDate?: string;
    remindDaysBefore?: number;
}): Promise<{
    success: true;
    expense: ExpenseRecord | null;
    schedule: RecurringExpenseRecord | null;
}> {
    const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to add expense");
    }
    return okBody<{
        success: true;
        expense: ExpenseRecord | null;
        schedule: RecurringExpenseRecord | null;
    }>(data);
}
export async function apiCreateRecurringExpense(token: string | null, body: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    payFrequency: string;
    nextDueDate: string;
    remindDaysBefore?: number;
    note?: string | null;
}): Promise<{
    success: true;
    schedule: RecurringExpenseRecord;
}> {
    const res = await fetch("/api/admin/expenses/schedules", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to add schedule");
    }
    return okBody<{
        success: true;
        schedule: RecurringExpenseRecord;
    }>(data);
}
export async function apiUpdateRecurringExpense(token: string | null, id: string, body: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    payFrequency: string;
    nextDueDate: string;
    remindDaysBefore?: number;
    note?: string | null;
}): Promise<{
    success: true;
    schedule: RecurringExpenseRecord;
}> {
    const res = await fetch(`/api/admin/expenses/schedules/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to update schedule");
    }
    return okBody<{
        success: true;
        schedule: RecurringExpenseRecord;
    }>(data);
}
export async function apiMarkRecurringPaid(token: string | null, id: string, body?: {
    amount?: number;
    expenseDate?: string;
}): Promise<{
    success: true;
    expense: ExpenseRecord;
    schedule: RecurringExpenseRecord;
}> {
    const res = await fetch(`/api/admin/expenses/schedules/${id}/mark-paid`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(body ?? {}),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to record payment");
    }
    return okBody<{
        success: true;
        expense: ExpenseRecord;
        schedule: RecurringExpenseRecord;
    }>(data);
}
export async function apiDeleteRecurringExpense(token: string | null, id: string): Promise<{
    success: true;
}> {
    const res = await fetch(`/api/admin/expenses/schedules/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to remove schedule");
    }
    return okBody<{
        success: true;
    }>(data);
}
export async function apiUpdateExpense(token: string | null, id: string, body: {
    title: string;
    amount: number;
    category: string;
    customCategory?: string | null;
    note?: string | null;
    expenseDate?: string;
}): Promise<{
    success: true;
    expense: ExpenseRecord;
}> {
    const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to update expense");
    }
    return okBody<{
        success: true;
        expense: ExpenseRecord;
    }>(data);
}
export async function apiDeleteExpense(token: string | null, id: string): Promise<{
    success: true;
}> {
    const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });
    const data = await parseJsonResponse<ApiError & Record<string, unknown>>(res);
    if (!res.ok) {
        throw new Error((data as ApiError).message ?? "Failed to delete expense");
    }
    return okBody<{
        success: true;
    }>(data);
}

