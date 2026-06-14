import type { ReturnSettings, ShopSettings } from "@/lib/api-client";
import { safeJsonParse } from "@/lib/safe-json";
const RETURN_KEY = "pos-cache-return-settings";
const SHOP_KEY = "pos-cache-shop-settings";
function read<T>(key: string): T | null {
    if (typeof window === "undefined")
        return null;
    const raw = sessionStorage.getItem(key);
    const parsed = safeJsonParse<T>(raw);
    if (raw && parsed === null) {
        sessionStorage.removeItem(key);
    }
    return parsed;
}
function write<T>(key: string, value: T) {
    if (typeof window === "undefined")
        return;
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    }
    catch {
    }
}
export function readReturnSettingsCache(): ReturnSettings | null {
    return read<ReturnSettings>(RETURN_KEY);
}
export function cacheReturnSettings(s: ReturnSettings) {
    write(RETURN_KEY, s);
}
export function readShopSettingsCache(): ShopSettings | null {
    return read<ShopSettings>(SHOP_KEY);
}
export function cacheShopSettings(s: ShopSettings) {
    write(SHOP_KEY, s);
}
export function readReceiptSettingsCache(): Pick<ShopSettings, "shopName" | "shopTagline" | "receiptPhone"> | null {
    const s = readShopSettingsCache();
    if (!s)
        return null;
    return {
        shopName: s.shopName,
        shopTagline: s.shopTagline,
        receiptPhone: s.receiptPhone,
    };
}
export function cacheReceiptSettings(s: Pick<ShopSettings, "shopName" | "shopTagline" | "receiptPhone">) {
    const existing = readShopSettingsCache();
    cacheShopSettings({
        shopName: s.shopName,
        shopTagline: s.shopTagline,
        receiptPhone: s.receiptPhone,
        returnsEnabled: existing?.returnsEnabled ?? true,
        returnRefundPercent: existing?.returnRefundPercent ?? 100,
    });
}

