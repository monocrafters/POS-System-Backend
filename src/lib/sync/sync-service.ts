import { prisma } from "@/lib/prisma";
import { readCloudConfig, isCloudConfigured } from "@/lib/cloud-config";
import {
    countShopCloudRecords,
    pullShopFromCloud,
    pushShopToCloud,
} from "@/lib/supabase/cloud-row-sync";
import type { SyncResult } from "./types";

function getShopId(): string {
    return readCloudConfig().shopId || "bata-store-01";
}

async function getOrCreateSyncMeta() {
    return prisma.syncMeta.upsert({
        where: { id: "global" },
        create: { id: "global", lastStatus: "idle" },
        update: {},
    });
}

async function updateSyncMeta(data: {
    lastStatus: string;
    lastError?: string | null;
    lastPullAt?: Date;
    lastPushAt?: Date;
    lastSyncAt?: Date;
    recordsPulled?: number;
    recordsPushed?: number;
}) {
    return prisma.syncMeta.upsert({
        where: { id: "global" },
        create: {
            id: "global",
            ...data,
        },
        update: data,
    });
}

async function countLocalRecords(): Promise<number> {
    const [
        users,
        shopSettings,
        products,
        barcodes,
        bills,
        billItems,
        returns,
        returnItems,
        recurringExpenses,
        expenses,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.shopSettings.count(),
        prisma.product.count(),
        prisma.productBarcode.count(),
        prisma.bill.count(),
        prisma.billItem.count(),
        prisma.return.count(),
        prisma.returnItem.count(),
        prisma.recurringExpense.count(),
        prisma.expense.count(),
    ]);
    return (
        users +
        shopSettings +
        products +
        barcodes +
        bills +
        billItems +
        returns +
        returnItems +
        recurringExpenses +
        expenses
    );
}

async function computePendingSince(lastSyncAt: Date | null): Promise<number> {
    if (!lastSyncAt) return Number.MAX_SAFE_INTEGER;
    const since = lastSyncAt;
    const [users, shopSettings, products, recurringExpenses, expenses, bills, returns] =
        await Promise.all([
            prisma.user.count({ where: { updatedAt: { gt: since } } }),
            prisma.shopSettings.count({ where: { updatedAt: { gt: since } } }),
            prisma.product.count({ where: { updatedAt: { gt: since } } }),
            prisma.recurringExpense.count({ where: { updatedAt: { gt: since } } }),
            prisma.expense.count({ where: { updatedAt: { gt: since } } }),
            prisma.bill.count({ where: { createdAt: { gt: since } } }),
            prisma.return.count({ where: { createdAt: { gt: since } } }),
        ]);
    return users + shopSettings + products + recurringExpenses + expenses + bills + returns;
}

export async function runInitialPullFromCloud(): Promise<SyncResult> {
    if (!isCloudConfigured()) {
        return {
            success: true,
            skipped: true,
            reason: "Cloud database not configured",
            pulled: 0,
            pushed: 0,
            syncedAt: new Date().toISOString(),
        };
    }
    const shopId = getShopId();
    try {
        await updateSyncMeta({ lastStatus: "syncing", lastError: null });
        const pulled = await pullShopFromCloud(shopId);
        const now = new Date();
        await updateSyncMeta({
            lastStatus: "success",
            lastError: null,
            lastPullAt: now,
            lastSyncAt: now,
            recordsPulled: pulled,
            recordsPushed: 0,
        });
        return {
            success: true,
            pulled,
            pushed: 0,
            syncedAt: now.toISOString(),
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Initial pull failed";
        await updateSyncMeta({
            lastStatus: "error",
            lastError: message,
        });
        return {
            success: false,
            pulled: 0,
            pushed: 0,
            syncedAt: new Date().toISOString(),
            error: message,
        };
    }
}

/** @deprecated use runInitialPullFromCloud */
export const runInitialPullFromMongo = runInitialPullFromCloud;

export async function runFullSync(): Promise<SyncResult> {
    if (!isCloudConfigured()) {
        return {
            success: true,
            skipped: true,
            reason: "Cloud database not configured",
            pulled: 0,
            pushed: 0,
            syncedAt: new Date().toISOString(),
        };
    }
    const shopId = getShopId();
    try {
        await updateSyncMeta({ lastStatus: "syncing", lastError: null });
        const pushed = await pushShopToCloud(shopId);
        const now = new Date();
        await updateSyncMeta({
            lastStatus: "success",
            lastError: null,
            lastPushAt: now,
            lastSyncAt: now,
            recordsPulled: 0,
            recordsPushed: pushed,
        });
        return {
            success: true,
            pulled: 0,
            pushed,
            syncedAt: now.toISOString(),
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed";
        await updateSyncMeta({
            lastStatus: "error",
            lastError: message,
        });
        return {
            success: false,
            pulled: 0,
            pushed: 0,
            syncedAt: new Date().toISOString(),
            error: message,
        };
    }
}

export async function getSyncStatus(): Promise<{
    configured: boolean;
    lastSyncAt: string | null;
    lastStatus: string;
    lastError: string | null;
    recordsPulled: number;
    recordsPushed: number;
    totalRecords: number;
    pendingRecords: number;
    percentBackedUp: number;
    cloudRecords: number;
}> {
    const meta = await getOrCreateSyncMeta();
    const shopId = getShopId();
    const total = await countLocalRecords();
    const cloudRecords = isCloudConfigured() ? await countShopCloudRecords(shopId) : 0;
    const pendingRaw = await computePendingSince(meta.lastSyncAt ?? null);
    const pending = pendingRaw === Number.MAX_SAFE_INTEGER ? total : Math.min(total, pendingRaw);
    const percent = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round(((total - pending) / total) * 100)));
    return {
        configured: isCloudConfigured(),
        lastSyncAt: meta.lastSyncAt?.toISOString() ?? null,
        lastStatus: meta.lastStatus,
        lastError: meta.lastError,
        recordsPulled: meta.recordsPulled,
        recordsPushed: meta.recordsPushed,
        totalRecords: total,
        pendingRecords: pending,
        percentBackedUp: percent,
        cloudRecords,
    };
}
