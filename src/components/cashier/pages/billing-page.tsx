"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Trash2, Printer, Eye, AlertCircle, Plus, Pencil, Package, Percent, ScanBarcode, Smartphone, } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ThermalReceipt } from "@/components/cashier/thermal-receipt";
import { useAuthStore } from "@/store/auth-store";
import { useBarcodeStore } from "@/store/barcode-store";
import { apiPosSearch, apiPosLookup, apiCreateBill, billToReceiptData, type PosProduct, type BillRecord, } from "@/lib/api-client";
import { lookupBarcode, searchCatalog, ensureCatalog, adjustCatalogStock, isCatalogLoaded, } from "@/lib/pos-catalog-cache";
import { usePosCatalog } from "@/hooks/use-pos-catalog";
import { formatMoney, setReceiptWidth, resolveReceiptWidth, printThermalReceipt, type ReceiptBillData, type ReceiptWidthMm, } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import { invalidateCashierAnalyticsCache } from "@/hooks/use-cashier-analytics";
import { useShopBranding } from "@/hooks/use-shop-settings";
interface CartLine {
    productId: string;
    barcode: string;
    name: string;
    unitPrice: number;
    quantity: number;
    stock: number;
    lineDiscount: number;
}
type DiscountMode = "percent" | "pkr";
const emptyForm = () => ({
    search: "",
    name: "",
    barcode: "",
    productId: null as string | null,
    quantity: "1",
    price: "",
    stock: 0,
    lineDiscount: "",
    lineDiscountMode: "pkr" as DiscountMode,
});
function discountAmount(input: string, mode: DiscountMode, base: number): number {
    const val = Math.max(0, parseFloat(input) || 0);
    if (mode === "percent") {
        return Math.min(base, (base * Math.min(100, val)) / 100);
    }
    return Math.min(base, val);
}
function lineTotal(line: CartLine): number {
    return Math.max(0, line.unitPrice * line.quantity - line.lineDiscount);
}
function Field({ label, children, className, }: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (<div className={cn("space-y-0.5", className)}>
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </div>);
}
export function BillingPage() {
    const token = useAuthStore((s) => s.token);
    const { shopName, shopTagline, phone: receiptPhone } = useShopBranding();
    const { ready: catalogReady } = usePosCatalog();
    const pendingScan = useBarcodeStore((s) => s.pendingScan);
    const scanTick = useBarcodeStore((s) => s.scanTick);
    const clearPending = useBarcodeStore((s) => s.clearPending);
    const searchRef = useRef<HTMLInputElement>(null);
    const searchValRef = useRef("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastScanAddRef = useRef<{
        key: string;
        at: number;
    } | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [discountInput, setDiscountInput] = useState("");
    const [billDiscountMode, setBillDiscountMode] = useState<DiscountMode>("percent");
    const [cart, setCart] = useState<CartLine[]>([]);
    const [suggestions, setSuggestions] = useState<PosProduct[]>([]);
    const [openSuggest, setOpenSuggest] = useState(false);
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const [searchDone, setSearchDone] = useState(false);
    const [scanNotFound, setScanNotFound] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saleBusy, setSaleBusy] = useState(false);
    const [receiptWidth, setReceiptWidthState] = useState<ReceiptWidthMm>(80);
    const [printerLabel, setPrinterLabel] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [lastReceipt, setLastReceipt] = useState<ReceiptBillData | null>(null);
    const [lastBill, setLastBill] = useState<BillRecord | null>(null);
    const [scannerPhoneUrl, setScannerPhoneUrl] = useState<string | null>(null);
    useEffect(() => {
        void fetch("/api/scanner/info")
            .then((r) => r.ok ? r.json() : null)
            .then((d) => {
            if (d?.phoneUrls?.[0])
                setScannerPhoneUrl(d.phoneUrls[0]);
        })
            .catch(() => { });
    }, []);
    useEffect(() => {
        void resolveReceiptWidth().then(({ widthMm, printerName }) => {
            setReceiptWidthState(widthMm);
            setPrinterLabel(printerName);
        });
        searchRef.current?.focus();
    }, []);
    const fillFromProduct = useCallback((p: PosProduct) => {
        setForm({
            search: "",
            name: p.name,
            barcode: p.barcode,
            productId: p.id,
            quantity: "1",
            price: String(p.price),
            stock: p.stock,
            lineDiscount: "",
            lineDiscountMode: "pkr",
        });
        searchValRef.current = "";
        setSuggestions([]);
        setOpenSuggest(false);
        setSearchDone(true);
        setError(null);
    }, []);
    const resetForm = useCallback(() => {
        setForm(emptyForm());
        setEditingId(null);
        searchValRef.current = "";
        setSuggestions([]);
        setOpenSuggest(false);
        searchRef.current?.focus();
    }, []);
    const addScannedProduct = useCallback((p: PosProduct) => {
        setScanNotFound(null);
        const dedupeKey = p.barcode || p.id;
        const now = Date.now();
        if (lastScanAddRef.current &&
            lastScanAddRef.current.key === dedupeKey &&
            now - lastScanAddRef.current.at < 2000) {
            return;
        }
        lastScanAddRef.current = { key: dedupeKey, at: now };
        setCart((prev) => {
            const existing = prev.find((l) => l.productId === p.id);
            if (existing) {
                if (existing.quantity >= p.stock) {
                    setError(`Max stock for "${p.name}" (${p.stock})`);
                    return prev;
                }
                setError(null);
                return prev.map((l) => l.productId === p.id
                    ? { ...l, quantity: l.quantity + 1, stock: p.stock }
                    : l);
            }
            if (p.stock < 1) {
                setError(`"${p.name}" is out of stock`);
                return prev;
            }
            setScanNotFound(null);
            setError(null);
            return [
                ...prev,
                {
                    productId: p.id,
                    barcode: p.barcode,
                    name: p.name,
                    unitPrice: p.price,
                    quantity: 1,
                    stock: p.stock,
                    lineDiscount: 0,
                },
            ];
        });
        resetForm();
        searchRef.current?.focus();
    }, [resetForm]);
    const commitToCart = useCallback((productOverride?: PosProduct) => {
        const productId = productOverride?.id ?? form.productId;
        if (!productId) {
            setError("Select a product first (search or scan)");
            return;
        }
        if (productOverride) {
            addScannedProduct(productOverride);
            return;
        }
        const name = (form.name || "").trim();
        const qty = Math.max(1, parseInt(form.quantity, 10) || 1);
        const price = parseFloat(form.price);
        const stock = form.stock;
        const barcode = form.barcode;
        if (!name) {
            setError("Product name is required");
            return;
        }
        if (!Number.isFinite(price) || price <= 0) {
            setError("Enter a valid price");
            return;
        }
        if (qty > stock) {
            setError(`Only ${stock} in stock`);
            return;
        }
        const grossLine = price * qty;
        const lineDisc = discountAmount(form.lineDiscount, form.lineDiscountMode, grossLine);
        setCart((prev) => {
            const existing = prev.find((l) => l.productId === productId);
            if (existing && editingId === productId) {
                return prev.map((l) => l.productId === productId
                    ? { ...l, name, unitPrice: price, quantity: qty, barcode, lineDiscount: lineDisc }
                    : l);
            }
            if (existing && !editingId) {
                const newQty = existing.quantity + qty;
                if (newQty > stock) {
                    setError(`Max stock ${stock}`);
                    return prev;
                }
                const mergedGross = price * newQty;
                const mergedDisc = existing.lineDiscount + lineDisc;
                return prev.map((l) => l.productId === productId
                    ? { ...l, name, unitPrice: price, quantity: newQty, lineDiscount: Math.min(mergedDisc, mergedGross) }
                    : l);
            }
            return [
                ...prev,
                {
                    productId,
                    barcode,
                    name,
                    unitPrice: price,
                    quantity: qty,
                    stock,
                    lineDiscount: lineDisc,
                },
            ];
        });
        setError(null);
        resetForm();
    }, [form, editingId, resetForm, addScannedProduct]);
    const resolveProduct = useCallback(async (code: string): Promise<PosProduct | null> => {
        const trimmed = code.trim();
        if (!trimmed)
            return null;
        const cached = lookupBarcode(trimmed);
        if (cached)
            return cached;
        if (isCatalogLoaded())
            return null;
        try {
            const res = await apiPosLookup(token, trimmed);
            return res.found && res.product ? res.product : null;
        }
        catch {
            return null;
        }
    }, [token]);
    const showNotFound = useCallback((code: string) => {
        setScanNotFound(code.trim());
        setError(null);
        setForm((f) => ({ ...f, search: code.trim() }));
        setOpenSuggest(false);
        setSuggestions([]);
    }, []);
    const loadFromBarcode = useCallback(async (code: string, autoAdd = false) => {
        const trimmed = code.trim();
        if (!trimmed)
            return;
        setScanNotFound(null);
        const product = await resolveProduct(trimmed);
        if (!product) {
            showNotFound(trimmed);
            return;
        }
        fillFromProduct(product);
        if (autoAdd)
            addScannedProduct(product);
    }, [resolveProduct, fillFromProduct, addScannedProduct, showNotFound]);
    const loadForEdit = (line: CartLine) => {
        setEditingId(line.productId);
        setForm({
            search: "",
            name: line.name,
            barcode: line.barcode,
            productId: line.productId,
            quantity: String(line.quantity),
            price: String(line.unitPrice),
            stock: line.stock,
            lineDiscount: line.lineDiscount > 0 ? String(line.lineDiscount) : "",
            lineDiscountMode: "pkr",
        });
        searchValRef.current = "";
        setSuggestions([]);
        setOpenSuggest(false);
        setSearchDone(false);
        setScanNotFound(null);
        setError(null);
    };
    useEffect(() => {
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        if (editingId) {
            setSuggestions([]);
            setOpenSuggest(false);
            return;
        }
        const q = form.search.trim();
        if (q.length < 1) {
            setSuggestions([]);
            setOpenSuggest(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setScanNotFound(null);
            setSearchDone(false);
            if (isCatalogLoaded()) {
                const local = searchCatalog(q);
                setSuggestions(local);
                setOpenSuggest(true);
                setSearchDone(true);
                const exact = local.find((p) => p.barcode === q);
                if (exact)
                    fillFromProduct(exact);
                return;
            }
            setLoadingSuggest(true);
            try {
                await ensureCatalog(token);
                if (isCatalogLoaded()) {
                    const local = searchCatalog(q);
                    setSuggestions(local);
                    const exact = local.find((p) => p.barcode === q);
                    if (exact)
                        fillFromProduct(exact);
                }
                else {
                    const res = await apiPosSearch(token, q);
                    setSuggestions(res.products);
                    const exact = res.products.find((p) => p.barcode === q);
                    if (exact)
                        fillFromProduct(exact);
                }
                setOpenSuggest(true);
            }
            catch {
                setSuggestions([]);
            }
            finally {
                setLoadingSuggest(false);
                setSearchDone(true);
            }
        }, 120);
        return () => {
            if (debounceRef.current)
                clearTimeout(debounceRef.current);
        };
    }, [form.search, token, fillFromProduct, editingId]);
    useEffect(() => {
        if (scanTick > 0 && pendingScan) {
            const trimmed = pendingScan.trim();
            if (trimmed) {
                setScanNotFound(null);
                void resolveProduct(trimmed).then((product) => {
                    if (product) {
                        addScannedProduct(product);
                    }
                    else {
                        showNotFound(trimmed);
                    }
                });
            }
            const t = setTimeout(() => clearPending(), 150);
            return () => clearTimeout(t);
        }
    }, [
        scanTick,
        pendingScan,
        clearPending,
        resolveProduct,
        addScannedProduct,
        showNotFound,
    ]);
    const pickSuggestion = (p: PosProduct) => {
        fillFromProduct(p);
        setOpenSuggest(false);
        setSuggestions([]);
    };
    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const v = searchValRef.current.trim();
            if (openSuggest && suggestions.length === 1) {
                pickSuggestion(suggestions[0]);
                return;
            }
            if (form.productId) {
                commitToCart();
                return;
            }
            void loadFromBarcode(v);
        }
        if (e.key === "Escape") {
            setOpenSuggest(false);
            if (editingId)
                resetForm();
        }
    };
    const removeLine = (productId: string) => {
        setCart((prev) => prev.filter((l) => l.productId !== productId));
        if (editingId === productId)
            resetForm();
    };
    const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);
    const billDiscount = discountAmount(discountInput, billDiscountMode, subtotal);
    const total = Math.max(0, subtotal - billDiscount);
    const itemCount = cart.reduce((s, l) => s + l.quantity, 0);
    const completeSale = async () => {
        if (cart.length === 0) {
            setError("Cart is empty");
            return;
        }
        if (saleBusy)
            return;
        setSaleBusy(true);
        setError(null);
        const soldLines = [...cart];
        try {
            const { bill } = await apiCreateBill(token, {
                items: soldLines.map((l) => ({
                    productId: l.productId,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    name: l.name,
                    lineDiscount: l.lineDiscount,
                })),
                discountAmount: billDiscount,
            });
            for (const line of soldLines) {
                adjustCatalogStock(line.productId, line.quantity);
            }
            setLastBill(bill);
            setLastReceipt(billToReceiptData(bill));
            invalidateCashierAnalyticsCache();
            setCart([]);
            setDiscountInput("");
            resetForm();
            setPreviewOpen(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Sale failed");
        }
        finally {
            setSaleBusy(false);
        }
    };
    return (<div className="flex h-full min-h-0 w-full min-w-0 flex-col lg:flex-row lg:divide-x lg:divide-neutral-200">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-neutral-200 px-6 py-4">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Bill discount" className="w-44 shrink-0">
              <div className="flex gap-1">
                <button type="button" onClick={() => setBillDiscountMode("pkr")} className={cn("rounded border px-2 py-1 text-[10px] font-semibold", billDiscountMode === "pkr" ? "border-red-600 bg-red-50 text-red-700" : "border-neutral-200 text-neutral-500")}>
                  PKR
                </button>
                <button type="button" onClick={() => setBillDiscountMode("percent")} className={cn("rounded border px-2 py-1 text-[10px] font-semibold", billDiscountMode === "percent" ? "border-red-600 bg-red-50 text-red-700" : "border-neutral-200 text-neutral-500")}>
                  %
                </button>
              </div>
              <div className="relative mt-1">
                {billDiscountMode === "percent" ? (<Percent className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"/>) : null}
                <Input type="number" min="0" max={billDiscountMode === "percent" ? "100" : undefined} step={billDiscountMode === "percent" ? "0.5" : "1"} value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0" className={cn("h-9 border-neutral-200 text-sm shadow-none", billDiscountMode === "percent" && "pl-8")}/>
              </div>
              {billDiscount > 0 && subtotal > 0 && (<p className="text-[10px] text-green-700">
                  −{formatMoney(billDiscount)}
                </p>)}
            </Field>
            {editingId && (<>
                <span className="text-xs font-medium text-amber-800">
                  <Pencil className="mr-1 inline h-3 w-3"/>
                  Editing line
                </span>
                <button type="button" onClick={resetForm} className="text-xs font-medium text-neutral-600 hover:text-neutral-900">
                  Cancel
                </button>
              </>)}
          </div>

          <div className="relative mb-3">
            <Field label="Search / scan">
              <Input ref={searchRef} value={form.search} onChange={(e) => {
            const v = e.target.value;
            searchValRef.current = v;
            setForm((f) => ({
                ...f,
                search: v,
                productId: editingId
                    ? f.productId
                    : f.barcode === v
                        ? f.productId
                        : null,
            }));
            if (!editingId)
                setOpenSuggest(true);
            setScanNotFound(null);
        }} onKeyDown={onSearchKeyDown} placeholder="Barcode or product name…" className="h-10 border-neutral-200 text-sm shadow-none" autoComplete="off"/>
            </Field>
            {scanNotFound && (<div role="alert" className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                <ScanBarcode className="h-4 w-4 shrink-0"/>
                <span>
                  No product found for <strong>{scanNotFound}</strong>
                </span>
                <button type="button" className="ml-auto text-xs font-medium underline" onClick={() => setScanNotFound(null)}>
                  Dismiss
                </button>
              </div>)}

            {openSuggest && !editingId && form.search.trim() && (<ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-auto border border-neutral-200 bg-white py-0.5 shadow-md">
                {loadingSuggest && !catalogReady && (<li className="space-y-2 px-3 py-2">
                    <Skeleton className="h-4 w-full"/>
                    <Skeleton className="h-4 w-3/4"/>
                  </li>)}
                {!loadingSuggest &&
                searchDone &&
                suggestions.length === 0 && (<li className="px-3 py-3 text-center text-sm text-neutral-500">
                      No products found
                    </li>)}
                {!loadingSuggest &&
                suggestions.map((p) => (<li key={p.id}>
                      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-red-50" onMouseDown={(e) => {
                        e.preventDefault();
                        pickSuggestion(p);
                    }}>
                        <Package className="h-4 w-4 shrink-0 text-red-600"/>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {p.name}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {p.barcode}
                        </span>
                        <span className="font-semibold text-red-600">
                          {formatMoney(p.price)}
                        </span>
                      </button>
                    </li>))}
              </ul>)}
          </div>

          <div className="grid grid-cols-12 gap-2">
            <Field label="Name" className="col-span-12 sm:col-span-4">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Receipt name" className="h-9 border-neutral-200 text-sm shadow-none"/>
            </Field>
            <Field label="Qty" className="col-span-3 sm:col-span-2">
              <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                commitToCart();
            }
        }} className="h-9 border-neutral-200 text-sm shadow-none"/>
              {form.productId && form.stock > 0 && (<p className="text-[10px] text-neutral-400">
                  Stock {form.stock}
                </p>)}
            </Field>
            <Field label="Price" className="col-span-3 sm:col-span-2">
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                commitToCart();
            }
        }} className="h-9 border-neutral-200 text-sm shadow-none"/>
            </Field>
            <Field label="Item disc." className="col-span-6 sm:col-span-2">
              <div className="flex gap-1">
                <button type="button" onClick={() => setForm((f) => ({ ...f, lineDiscountMode: "pkr" }))} className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold", form.lineDiscountMode === "pkr" ? "border-red-600 bg-red-50 text-red-700" : "border-neutral-200 text-neutral-500")}>
                  Rs
                </button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, lineDiscountMode: "percent" }))} className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold", form.lineDiscountMode === "percent" ? "border-red-600 bg-red-50 text-red-700" : "border-neutral-200 text-neutral-500")}>
                  %
                </button>
              </div>
              <Input type="number" min="0" step="0.01" value={form.lineDiscount} onChange={(e) => setForm((f) => ({ ...f, lineDiscount: e.target.value }))} placeholder="0" className="mt-0.5 h-9 border-neutral-200 text-sm shadow-none"/>
            </Field>
            <div className="col-span-6 flex items-end sm:col-span-2">
              <Button type="button" onClick={() => commitToCart()} disabled={!form.productId && !form.name} className="h-9 w-full gap-1.5 bg-red-600 text-sm font-semibold hover:bg-red-700">
                <Plus className="h-4 w-4"/>
                {editingId ? "Update" : "Add"}
              </Button>
            </div>
          </div>

          {error && (<p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0"/>
              {error}
            </p>)}
          <p className="mt-1.5 text-[10px] text-neutral-400">
            Scan +1 · double-click row to edit
          </p>
          {scannerPhoneUrl && (<div className="mt-2 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-[11px] text-red-900">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
              <span>
                Phone camera scanner:{" "}
                <a href={scannerPhoneUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                  {scannerPhoneUrl}
                </a>
                {" "}(same Wi‑Fi, trust certificate once)
              </span>
            </div>)}
        </div>

        <div className="scrollbar-modern min-h-0 flex-1 overflow-auto">
          {cart.length === 0 ? (<p className="py-16 text-center text-sm text-neutral-400">
              Cart is empty — scan or add items
            </p>) : (<table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-white text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Product</th>
                  <th className="px-4 py-2 text-right font-medium">Price</th>
                  <th className="px-4 py-2 text-center font-medium">Qty</th>
                  <th className="px-4 py-2 text-right font-medium">Disc.</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="w-10"/>
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (<tr key={line.productId} onDoubleClick={() => loadForEdit(line)} className={cn("cursor-pointer border-b border-neutral-100 hover:bg-neutral-50", editingId === line.productId && "bg-amber-50/80")} title="Double-click to edit">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-neutral-900">{line.name}</p>
                      <p className="text-[10px] text-neutral-400">{line.barcode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMoney(line.unitPrice)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-green-700">
                      {line.lineDiscount > 0 ? `−${formatMoney(line.lineDiscount)}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-[#E31837]">
                      {formatMoney(lineTotal(line))}
                    </td>
                    <td className="px-2 py-2.5">
                      <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    removeLine(line.productId);
                }} className="p-1 text-neutral-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col border-t border-neutral-200 px-6 py-5 lg:w-[272px] lg:border-t-0">
        <div className="mb-4 border-b border-neutral-100 pb-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Receipt</span>
            <span className="font-bold text-[#E31837]">{receiptWidth}mm</span>
          </div>
          <div className="mt-2 flex gap-1">
            {([58, 80] as const).map((mm) => (<button key={mm} type="button" onClick={() => {
                setReceiptWidth(mm);
                setReceiptWidthState(mm);
            }} className={cn("flex-1 border py-1 text-xs font-semibold", receiptWidth === mm
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-neutral-200 text-neutral-600")}>
                {mm}mm
              </button>))}
          </div>
          {printerLabel && (<p className="mt-1 truncate text-[10px] text-neutral-400">
              {printerLabel}
            </p>)}
          <button type="button" className="mt-1 text-[10px] text-red-600 hover:underline" onClick={() => {
            void resolveReceiptWidth().then(({ widthMm, printerName }) => {
                setReceiptWidthState(widthMm);
                setPrinterLabel(printerName);
            });
        }}>
            Re-detect
          </button>
        </div>

        <div className="mt-auto space-y-2 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Items</span>
            <span className="tabular-nums">{itemCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-medium tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          {billDiscount > 0 && (<div className="flex justify-between text-green-700">
              <span>Bill discount{billDiscountMode === "percent" ? ` (${discountInput}%)` : ""}</span>
              <span className="tabular-nums">−{formatMoney(billDiscount)}</span>
            </div>)}
          <div className="flex justify-between border-t border-neutral-200 pt-2">
            <span className="font-bold">Total</span>
            <span className="text-xl font-bold tabular-nums text-[#E31837]">
              {formatMoney(total)}
            </span>
          </div>
          <Button type="button" disabled={saleBusy || cart.length === 0} onClick={() => void completeSale()} className="mt-2 h-11 w-full bg-red-600 font-bold hover:bg-red-700 disabled:opacity-60">
            Complete sale
          </Button>
          {lastReceipt && (<button type="button" onClick={() => setPreviewOpen(true)} className="flex w-full items-center justify-center gap-2 py-2 text-xs font-medium text-neutral-600 hover:text-red-600">
              <Eye className="h-3.5 w-3.5"/>
              Last receipt
            </button>)}
        </div>
      </div>

      <Modal open={previewOpen && !!lastReceipt} onClose={() => setPreviewOpen(false)} title="Receipt preview" description={lastBill?.billNumber} className="max-w-[420px]">
        {lastReceipt && (<div className="space-y-4">
            <div className="max-h-[55vh] overflow-auto rounded-lg border bg-neutral-50 p-4">
              <ThermalReceipt bill={lastReceipt} widthMm={receiptWidth} shopName={shopName} shopTagline={shopTagline} shopPhone={receiptPhone}/>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <Button type="button" className="flex-1 gap-2 bg-red-600 hover:bg-red-700" onClick={() => printThermalReceipt(receiptWidth)}>
                <Printer className="h-4 w-4"/>
                Print
              </Button>
            </div>
          </div>)}
      </Modal>
    </div>);
}

