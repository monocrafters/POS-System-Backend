import type { PosProduct } from "@/lib/api-client";
export interface CatalogEntry {
    id: string;
    name: string;
    price: number;
    stock: number;
    barcodes: string[];
    barcode: string;
}
let catalog: CatalogEntry[] = [];
let barcodeMap = new Map<string, PosProduct>();
let loadedAt = 0;
let loadPromise: Promise<void> | null = null;
function rebuildMaps(entries: CatalogEntry[]) {
    catalog = entries;
    barcodeMap = new Map();
    for (const p of entries) {
        const pos: PosProduct = {
            id: p.id,
            name: p.name,
            price: p.price,
            stock: p.stock,
            barcode: p.barcode,
        };
        for (const code of p.barcodes) {
            if (code.trim())
                barcodeMap.set(code.trim(), pos);
        }
    }
    loadedAt = Date.now();
}
export function isCatalogLoaded() {
    return catalog.length > 0;
}
export function lookupBarcode(code: string): PosProduct | null {
    const key = code.trim();
    if (!key)
        return null;
    return barcodeMap.get(key) ?? null;
}
export function searchCatalog(query: string, limit = 12): PosProduct[] {
    const q = query.trim().toLowerCase();
    if (!q)
        return [];
    const out: PosProduct[] = [];
    const seen = new Set<string>();
    for (const p of catalog) {
        if (seen.has(p.id))
            continue;
        const matchName = p.name.toLowerCase().includes(q);
        const matchCode = p.barcodes.some((b) => b.toLowerCase().includes(q));
        if (matchName || matchCode) {
            seen.add(p.id);
            out.push({
                id: p.id,
                name: p.name,
                price: p.price,
                stock: p.stock,
                barcode: p.barcode,
            });
            if (out.length >= limit)
                break;
        }
    }
    return out;
}
export async function ensureCatalog(token: string | null): Promise<void> {
    if (!token)
        return;
    if (catalog.length > 0)
        return;
    if (loadPromise)
        return loadPromise;
    loadPromise = (async () => {
        const res = await fetch("/api/pos/catalog", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            throw new Error("Catalog load failed");
        const data = (await res.json()) as {
            success: boolean;
            products: CatalogEntry[];
        };
        if (data.success && data.products)
            rebuildMaps(data.products);
    })().finally(() => {
        loadPromise = null;
    });
    return loadPromise;
}
export function invalidateCatalog() {
    catalog = [];
    barcodeMap = new Map();
    loadedAt = 0;
}
export function adjustCatalogStock(productId: string, deltaQty: number) {
    for (const p of catalog) {
        if (p.id === productId) {
            p.stock = Math.max(0, p.stock - deltaQty);
            const pos = barcodeMap.get(p.barcode);
            if (pos)
                pos.stock = p.stock;
            for (const code of p.barcodes) {
                const hit = barcodeMap.get(code);
                if (hit)
                    hit.stock = p.stock;
            }
            break;
        }
    }
}

