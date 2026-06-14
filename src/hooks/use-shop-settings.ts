"use client";
import { useCallback, useEffect, useState } from "react";
import { apiGetShopBranding, apiGetShopSettings, type ShopSettings, } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { DEFAULT_SHOP_NAME, DEFAULT_SHOP_TAGLINE, } from "@/lib/shop-settings";
let cached: ShopSettings | undefined;
let cacheToken: string | null | undefined;
function applyDocumentTitle(name: string) {
    if (typeof document !== "undefined") {
        document.title = name;
    }
}
export function useShopBranding() {
    const token = useAuthStore((s) => s.token);
    const [shopName, setShopName] = useState(cached && cacheToken === token ? cached.shopName : DEFAULT_SHOP_NAME);
    const [shopTagline, setShopTagline] = useState(cached && cacheToken === token
        ? cached.shopTagline
        : DEFAULT_SHOP_TAGLINE);
    const [phone, setPhone] = useState<string | null>(cached && cacheToken === token ? cached.receiptPhone : null);
    const [loading, setLoading] = useState(cached === undefined);
    const load = useCallback(async () => {
        try {
            if (token) {
                const res = await apiGetShopSettings(token);
                cached = res.settings;
                cacheToken = token;
                setShopName(res.settings.shopName);
                setShopTagline(res.settings.shopTagline);
                setPhone(res.settings.receiptPhone);
                applyDocumentTitle(res.settings.shopName);
            }
            else {
                const res = await apiGetShopBranding();
                cacheToken = null;
                cached = {
                    shopName: res.branding.shopName,
                    shopTagline: res.branding.shopTagline,
                    receiptPhone: null,
                    returnsEnabled: true,
                    returnRefundPercent: 100,
                };
                setShopName(res.branding.shopName);
                setShopTagline(res.branding.shopTagline);
                setPhone(null);
                applyDocumentTitle(res.branding.shopName);
            }
        }
        catch {
            setShopName(DEFAULT_SHOP_NAME);
            setShopTagline(DEFAULT_SHOP_TAGLINE);
            setPhone(null);
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    useEffect(() => {
        if (cacheToken === token && cached !== undefined) {
            setShopName(cached.shopName);
            setShopTagline(cached.shopTagline);
            setPhone(cached.receiptPhone);
            applyDocumentTitle(cached.shopName);
            setLoading(false);
            return;
        }
        void load();
    }, [load, token]);
    return { shopName, shopTagline, phone, loading, refresh: load };
}
export function invalidateShopSettingsCache() {
    cached = undefined;
    cacheToken = undefined;
}
export function invalidateReceiptPhoneCache() {
    invalidateShopSettingsCache();
}
export function useReceiptPhone() {
    const { phone, loading, refresh } = useShopBranding();
    return { phone, loading, refresh };
}

