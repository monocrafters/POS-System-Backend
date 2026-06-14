"use client";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Plus, RefreshCw, Loader2, Pencil, Trash2, Barcode, AlertCircle, CheckCircle2, X, Search, } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { useBarcodeStore } from "@/store/barcode-store";
import { apiFetchProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct, apiLookupProductByBarcode, type ProductRecord, } from "@/lib/api-client";
import { cn } from "@/lib/utils";
const productFormSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    price: z.coerce.number().positive("Sale price must be greater than 0"),
    purchaseCost: z.coerce.number().min(0, "Purchase cost cannot be negative"),
    stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});
type ProductForm = z.infer<typeof productFormSchema>;
function formatPrice(n: number) {
    return `Rs ${n.toLocaleString("en-PK")}`;
}
export function ProductsPage() {
    const token = useAuthStore((s) => s.token);
    const pendingScan = useBarcodeStore((s) => s.pendingScan);
    const scanTick = useBarcodeStore((s) => s.scanTick);
    const clearPending = useBarcodeStore((s) => s.clearPending);
    const [products, setProducts] = useState<ProductRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ProductRecord | null>(null);
    const [barcodes, setBarcodes] = useState<string[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [manualBarcode, setManualBarcode] = useState("");
    const [search, setSearch] = useState("");
    const form = useForm<ProductForm>({
        resolver: zodResolver(productFormSchema),
        defaultValues: { name: "", price: 1, purchaseCost: 0, stock: 0 },
    });
    const loadProducts = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setLoading(true);
        setListError(null);
        try {
            const data = await apiFetchProducts(token);
            setProducts(data.products);
        }
        catch (err) {
            setListError(err instanceof Error ? err.message : "Failed to load products");
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);
    useEffect(() => {
        loadProducts();
    }, [loadProducts]);
    const openCreate = useCallback((initialBarcodes: string[] = []) => {
        setEditing(null);
        setBarcodes([...new Set(initialBarcodes.filter(Boolean))]);
        form.reset({ name: "", price: 1, purchaseCost: 0, stock: 0 });
        setFormError(null);
        setFormSuccess(null);
        setModalOpen(true);
    }, [form]);
    const openEdit = useCallback((product: ProductRecord) => {
        setEditing(product);
        setBarcodes(product.barcodes.map((b) => b.barcode));
        form.reset({
            name: product.name,
            price: product.price,
            purchaseCost: product.purchaseCost ?? 0,
            stock: product.stock,
        });
        setFormError(null);
        setFormSuccess(null);
        setModalOpen(true);
    }, [form]);
    const addBarcodeToForm = useCallback((code: string) => {
        const trimmed = code.trim();
        if (!trimmed)
            return;
        setBarcodes((prev) => {
            if (prev.includes(trimmed))
                return prev;
            return [...prev, trimmed];
        });
        setFormSuccess(`Barcode added (${trimmed})`);
        setFormError(null);
    }, []);
    const processScan = useCallback(async (code: string) => {
        const trimmed = code.trim();
        if (!trimmed)
            return;
        if (modalOpen) {
            if (barcodes.includes(trimmed)) {
                setFormError("This barcode is already on this product");
                return;
            }
            if (editing) {
                const belongsToOther = await apiLookupProductByBarcode(token, trimmed);
                if (belongsToOther.found &&
                    belongsToOther.product &&
                    belongsToOther.product.id !== editing.id) {
                    setFormError(`Barcode belongs to "${belongsToOther.product.name}" — remove it there first`);
                    return;
                }
                addBarcodeToForm(trimmed);
                return;
            }
            const lookup = await apiLookupProductByBarcode(token, trimmed);
            if (lookup.found && lookup.product) {
                setFormError(`Barcode already on "${lookup.product.name}". Close modal to edit that product.`);
                return;
            }
            addBarcodeToForm(trimmed);
            return;
        }
        const lookup = await apiLookupProductByBarcode(token, trimmed);
        if (lookup.found && lookup.product) {
            openEdit(lookup.product);
            return;
        }
        openCreate([trimmed]);
    }, [
        modalOpen,
        barcodes,
        editing,
        token,
        addBarcodeToForm,
        openCreate,
        openEdit,
    ]);
    useEffect(() => {
        if (!pendingScan)
            return;
        void processScan(pendingScan);
        clearPending();
    }, [scanTick, pendingScan, processScan, clearPending]);
    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        setBarcodes([]);
        setManualBarcode("");
        setFormError(null);
        setFormSuccess(null);
    };
    const removeBarcode = (code: string) => {
        setBarcodes((prev) => prev.filter((b) => b !== code));
    };
    const onSubmit = form.handleSubmit(async (values) => {
        if (barcodes.length === 0) {
            setFormError("Add at least one barcode");
            return;
        }
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);
        try {
            const body = {
                name: values.name,
                price: values.price,
                purchaseCost: values.purchaseCost,
                stock: values.stock,
                barcodes,
            };
            if (editing) {
                await apiUpdateProduct(token, editing.id, body);
                setFormSuccess("Product updated");
            }
            else {
                await apiCreateProduct(token, body);
                setFormSuccess("Product created");
            }
            await loadProducts(true);
            setTimeout(closeModal, 600);
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : "Save failed");
        }
        finally {
            setSubmitting(false);
        }
    });
    const confirmDelete = async () => {
        if (!deleteTarget)
            return;
        setDeleting(true);
        try {
            await apiDeleteProduct(token, deleteTarget.id);
            setDeleteTarget(null);
            await loadProducts(true);
        }
        catch (err) {
            setListError(err instanceof Error ? err.message : "Delete failed");
            setDeleteTarget(null);
        }
        finally {
            setDeleting(false);
        }
    };
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
        if (!q)
            return true;
        if (p.name.toLowerCase().includes(q))
            return true;
        return p.barcodes.some((b) => b.barcode.toLowerCase().includes(q));
    });
    return (<div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-neutral-700">
            {loading ? "…" : `${products.length} products`}
          </span>
          <span className="hidden text-neutral-300 sm:inline">|</span>
          <p className="text-sm text-neutral-500">
            Shop catalog — add manually or scan a barcode while this page is open
          </p>
        </div>
        <div className="relative w-full min-w-[200px] sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"/>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or barcode…" className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50/80 pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"/>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => loadProducts(true)} disabled={refreshing} className="h-9 gap-2 rounded-lg border-neutral-200">
            {refreshing ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<RefreshCw className="h-4 w-4"/>)}
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => openCreate()} className="h-9 gap-2 rounded-lg bg-[#E31837] hover:bg-red-700">
            <Plus className="h-4 w-4"/>
            Add product
          </Button>
        </div>
      </div>

      {listError && (<div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700 lg:px-8">
          <AlertCircle className="h-4 w-4 shrink-0"/>
          {listError}
        </div>)}

      {loading ? (<SkeletonTable rows={10} cols={5}/>) : products.length === 0 ? (<div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <Package className="mb-3 h-10 w-10 text-neutral-300"/>
          <p className="font-medium text-neutral-800">No products in catalog</p>
          <p className="mt-1 text-sm text-neutral-500">
            Add your first product to start billing at the counter.
          </p>
          <Button type="button" onClick={() => openCreate()} className="mt-5 gap-2 bg-[#E31837] hover:bg-red-700">
            <Plus className="h-4 w-4"/>
            Add product
          </Button>
        </div>) : filtered.length === 0 ? (<p className="py-16 text-center text-sm text-neutral-500">
          No products match your search
        </p>) : (<div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-neutral-50">
              <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3 lg:px-8">Product</th>
                <th className="px-5 py-3 lg:px-8">Barcodes</th>
                <th className="px-5 py-3 lg:px-8">Sale price</th>
                <th className="px-5 py-3 lg:px-8">Purchase cost</th>
                <th className="px-5 py-3 lg:px-8">Stock</th>
                <th className="px-5 py-3 text-right lg:px-8">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (<tr key={p.id} className="border-b border-neutral-100 transition-colors hover:bg-neutral-50/80">
                  <td className="px-5 py-3.5 font-medium text-neutral-900 lg:px-8">
                    {p.name}
                  </td>
                  <td className="px-5 py-3.5 lg:px-8">
                    <div className="flex flex-wrap gap-1.5">
                      {p.barcodes.map((b) => (<span key={b.id} className="inline-flex items-center gap-1 font-mono text-xs text-neutral-600">
                          <Barcode className="h-3 w-3 shrink-0 text-[#E31837]"/>
                          {b.barcode}
                        </span>))}
                      {p.barcodes.length === 0 && (<span className="text-xs text-neutral-400">—</span>)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-neutral-800 lg:px-8">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-neutral-500 lg:px-8">
                    {formatPrice(p.purchaseCost ?? 0)}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-neutral-800 lg:px-8">
                    {p.stock}
                  </td>
                  <td className="px-5 py-3.5 text-right lg:px-8">
                    <div className="inline-flex gap-0.5">
                      <button type="button" onClick={() => openEdit(p)} className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-[#E31837]" aria-label="Edit">
                        <Pencil className="h-4 w-4"/>
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(p)} className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit product" : "New product"} description={editing
            ? "Update details or scan another barcode to add Barcode 2, 3…"
            : "Set name, price, stock. Scan again while open to add more barcodes."} className="max-w-[480px]">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label className="text-neutral-700">Barcodes</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {barcodes.length === 0 ? (<p className="text-xs text-neutral-400">No barcode yet — scan or type below</p>) : (barcodes.map((code, i) => (<span key={code} className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-900">
                    Barcode {i + 1}: {code}
                    <button type="button" onClick={() => removeBarcode(code)} className="rounded p-0.5 hover:bg-red-100" aria-label="Remove barcode">
                      <X className="h-3.5 w-3.5"/>
                    </button>
                  </span>)))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input placeholder="Barcode (scan fills this)" value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addBarcodeToForm(manualBarcode);
                setManualBarcode("");
            }
        }}/>
              <Button type="button" variant="outline" onClick={() => {
            addBarcodeToForm(manualBarcode);
            setManualBarcode("");
        }}>
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="prod-name">Name</Label>
            <Input id="prod-name" className="mt-1.5" {...form.register("name")}/>
            {form.formState.errors.name && (<p className="mt-1 text-xs text-red-600">
                {form.formState.errors.name.message}
              </p>)}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="prod-purchase">Purchase cost (Rs)</Label>
              <Input id="prod-purchase" type="number" step="0.01" min="0" className="mt-1.5" {...form.register("purchaseCost")}/>
              <p className="mt-1 text-[10px] text-neutral-400">Admin only — used for profit analytics</p>
              {form.formState.errors.purchaseCost && (<p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.purchaseCost.message}
                </p>)}
            </div>
            <div>
              <Label htmlFor="prod-price">Sale price (Rs)</Label>
              <Input id="prod-price" type="number" step="0.01" min="0" className="mt-1.5" {...form.register("price")}/>
              {form.formState.errors.price && (<p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.price.message}
                </p>)}
            </div>
          </div>

          <div>
            <Label htmlFor="prod-stock">Stock</Label>
            <Input id="prod-stock" type="number" min="0" className="mt-1.5" {...form.register("stock")}/>
            {form.formState.errors.stock && (<p className="mt-1 text-xs text-red-600">
                {form.formState.errors.stock.message}
              </p>)}
          </div>

          {formError && (<div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0"/>
              {formError}
            </div>)}
          {formSuccess && (<div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0"/>
              {formSuccess}
            </div>)}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className={cn("flex-1 bg-red-600 hover:bg-red-700")}>
              {submitting ? (<Loader2 className="h-4 w-4 animate-spin"/>) : editing ? ("Save changes") : ("Create product")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove product?" description={`"${deleteTarget?.name}" will be removed from the shop catalog only. Past bills, receipts, and returns stay unchanged — sale history is saved on each bill line.`}>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button type="button" disabled={deleting} onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Remove"}
          </Button>
        </div>
      </Modal>
    </div>);
}

