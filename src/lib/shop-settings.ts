import { prisma } from "@/lib/prisma";
export const DEFAULT_SHOP_NAME = "Bata POS";
export const DEFAULT_SHOP_TAGLINE = "Retail Store";
export interface ReturnSettings {
    returnsEnabled: boolean;
    returnRefundPercent: number;
}
export interface ShopBranding {
    shopName: string;
    shopTagline: string;
}
export interface ShopSettings extends ShopBranding {
    receiptPhone: string | null;
    returnsEnabled: boolean;
    returnRefundPercent: number;
}
export type ShopSettingsUpdate = Partial<{
    shopName: string;
    shopTagline: string | null;
    receiptPhone: string | null;
    returnsEnabled: boolean;
    returnRefundPercent: number;
}>;
const DEFAULTS: ShopSettings = {
    shopName: DEFAULT_SHOP_NAME,
    shopTagline: DEFAULT_SHOP_TAGLINE,
    receiptPhone: null,
    returnsEnabled: true,
    returnRefundPercent: 100,
};
function mapRow(row: {
    shopName: string;
    shopTagline: string;
    receiptPhone: string | null;
    returnsEnabled: boolean;
    returnRefundPercent: number;
}): ShopSettings {
    return {
        shopName: row.shopName?.trim() || DEFAULT_SHOP_NAME,
        shopTagline: row.shopTagline?.trim() || DEFAULT_SHOP_TAGLINE,
        receiptPhone: row.receiptPhone?.trim() || null,
        returnsEnabled: row.returnsEnabled,
        returnRefundPercent: row.returnRefundPercent,
    };
}
export async function ensureShopSettingsRow() {
    const row = await prisma.shopSettings.findUnique({
        where: { id: "global" },
    });
    if (!row) {
        await prisma.shopSettings.create({
            data: { id: "global", ...DEFAULTS },
        });
    }
}
export async function getShopBranding(): Promise<ShopBranding> {
    await ensureShopSettingsRow();
    const row = await prisma.shopSettings.findUnique({
        where: { id: "global" },
    });
    return {
        shopName: row?.shopName?.trim() || DEFAULT_SHOP_NAME,
        shopTagline: row?.shopTagline?.trim() || DEFAULT_SHOP_TAGLINE,
    };
}
export async function getShopSettings(): Promise<ShopSettings> {
    await ensureShopSettingsRow();
    const row = await prisma.shopSettings.findUnique({
        where: { id: "global" },
    });
    if (!row)
        return DEFAULTS;
    return mapRow(row);
}
export async function updateShopSettings(data: ShopSettingsUpdate): Promise<ShopSettings> {
    await ensureShopSettingsRow();
    const current = await getShopSettings();
    const next: ShopSettings = {
        shopName: data.shopName !== undefined
            ? data.shopName.trim() || DEFAULT_SHOP_NAME
            : current.shopName,
        shopTagline: data.shopTagline !== undefined
            ? data.shopTagline?.trim() || DEFAULT_SHOP_TAGLINE
            : current.shopTagline,
        receiptPhone: data.receiptPhone !== undefined
            ? data.receiptPhone?.trim() || null
            : current.receiptPhone,
        returnsEnabled: data.returnsEnabled ?? current.returnsEnabled,
        returnRefundPercent: data.returnRefundPercent !== undefined
            ? Math.min(100, Math.max(0, data.returnRefundPercent))
            : current.returnRefundPercent,
    };
    const row = await prisma.shopSettings.upsert({
        where: { id: "global" },
        create: { id: "global", ...next },
        update: next,
    });
    return mapRow(row);
}
export async function getReturnSettings(): Promise<ReturnSettings> {
    const s = await getShopSettings();
    return {
        returnsEnabled: s.returnsEnabled,
        returnRefundPercent: s.returnRefundPercent,
    };
}
export async function updateReturnSettings(data: Partial<ReturnSettings>): Promise<ReturnSettings> {
    const updated = await updateShopSettings(data);
    return {
        returnsEnabled: updated.returnsEnabled,
        returnRefundPercent: updated.returnRefundPercent,
    };
}
export interface ReceiptSettings {
    shopName: string;
    shopTagline: string;
    receiptPhone: string | null;
}
export async function getReceiptSettings(): Promise<ReceiptSettings> {
    const s = await getShopSettings();
    return {
        shopName: s.shopName,
        shopTagline: s.shopTagline,
        receiptPhone: s.receiptPhone,
    };
}
export async function updateReceiptSettings(data: Partial<ReceiptSettings>): Promise<ReceiptSettings> {
    const updated = await updateShopSettings(data);
    return {
        shopName: updated.shopName,
        shopTagline: updated.shopTagline,
        receiptPhone: updated.receiptPhone,
    };
}

