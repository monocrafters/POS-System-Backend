import { prisma } from "@/lib/prisma";
import { readCloudConfig } from "@/lib/cloud-config";
import { connectMongo, isMongoConfigured } from "@/lib/mongodb";
import type { BackupSnapshotV1 } from "@/lib/sync/snapshot-types";
import { MongoUser } from "@/lib/mongodb/models/user";
import type { SyncResult } from "./types";
import type { Role, BillStatus } from "@prisma/client";
import type mongoose from "mongoose";
import type { Collection } from "mongodb";
function getShopId(): string {
    return readCloudConfig().shopId || "bata-default";
}
function getBackupsCollection(conn: typeof mongoose): Collection {
    const db = conn.connection.db;
    if (!db) {
        throw new Error("MongoDB database handle not available");
    }
    return db.collection("backups");
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
function toIso(d: Date) {
    return d.toISOString();
}
async function buildSnapshot(shopId: string): Promise<BackupSnapshotV1> {
    const [users, shopSettings, productsWithBarcodes, billsWithItems, returnsWithItems, recurringExpenses, expenses,] = await Promise.all([
        prisma.user.findMany(),
        prisma.shopSettings.findUnique({ where: { id: "global" } }),
        prisma.product.findMany({
            include: { barcodes: true },
        }),
        prisma.bill.findMany({
            include: { items: true },
        }),
        prisma.return.findMany({
            include: { items: true },
        }),
        prisma.recurringExpense.findMany(),
        prisma.expense.findMany(),
    ]);
    const products = productsWithBarcodes.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        purchaseCost: p.purchaseCost,
        stock: p.stock,
        isActive: p.isActive,
        createdAt: toIso(p.createdAt),
        updatedAt: toIso(p.updatedAt),
    }));
    const productBarcodes = productsWithBarcodes.flatMap((p) => p.barcodes.map((b) => ({
        id: b.id,
        barcode: b.barcode,
        productId: b.productId,
        createdAt: toIso(b.createdAt),
    })));
    const bills = billsWithItems.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        cashierId: b.cashierId,
        subtotal: b.subtotal,
        discountAmount: b.discountAmount,
        total: b.total,
        itemCount: b.itemCount,
        status: b.status,
        createdAt: toIso(b.createdAt),
    }));
    const billItems = billsWithItems.flatMap((b) => b.items.map((i) => ({
        id: i.id,
        billId: i.billId,
        productId: i.productId,
        barcode: i.barcode,
        name: i.name,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost,
        quantity: i.quantity,
        lineDiscount: i.lineDiscount,
        lineTotal: i.lineTotal,
    })));
    const returns = returnsWithItems.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        billId: r.billId,
        cashierId: r.cashierId,
        refundAmount: r.refundAmount,
        refundPercent: r.refundPercent,
        itemCount: r.itemCount,
        createdAt: toIso(r.createdAt),
    }));
    const returnItems = returnsWithItems.flatMap((r) => r.items.map((i) => ({
        id: i.id,
        returnId: i.returnId,
        billItemId: i.billItemId,
        productId: i.productId,
        name: i.name,
        barcode: i.barcode,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineRefund: i.lineRefund,
    })));
    return {
        version: 1,
        shopId,
        createdAt: new Date().toISOString(),
        data: {
            users: users.map((u) => ({
                id: u.id,
                username: u.username,
                password: u.password,
                fullName: u.fullName,
                role: u.role,
                isActive: u.isActive,
                createdAt: toIso(u.createdAt),
                updatedAt: toIso(u.updatedAt),
            })),
            shopSettings: shopSettings
                ? {
                    id: shopSettings.id,
                    shopName: shopSettings.shopName,
                    shopTagline: shopSettings.shopTagline,
                    receiptPhone: shopSettings.receiptPhone ?? null,
                    returnsEnabled: shopSettings.returnsEnabled,
                    returnRefundPercent: shopSettings.returnRefundPercent,
                    updatedAt: toIso(shopSettings.updatedAt),
                }
                : null,
            products,
            productBarcodes,
            bills,
            billItems,
            returns,
            returnItems,
            recurringExpenses: recurringExpenses.map((r) => ({
                id: r.id,
                title: r.title,
                amount: r.amount,
                category: r.category,
                customCategory: r.customCategory ?? null,
                payFrequency: r.payFrequency,
                nextDueDate: toIso(r.nextDueDate),
                remindDaysBefore: r.remindDaysBefore,
                note: r.note ?? null,
                isActive: r.isActive,
                createdAt: toIso(r.createdAt),
                updatedAt: toIso(r.updatedAt),
            })),
            expenses: expenses.map((e) => ({
                id: e.id,
                title: e.title,
                amount: e.amount,
                category: e.category,
                customCategory: e.customCategory ?? null,
                note: e.note ?? null,
                expenseDate: toIso(e.expenseDate),
                recurringExpenseId: e.recurringExpenseId ?? null,
                createdAt: toIso(e.createdAt),
                updatedAt: toIso(e.updatedAt),
            })),
        },
    };
}
function countSnapshotRecords(s: BackupSnapshotV1): number {
    return (s.data.users.length +
        (s.data.shopSettings ? 1 : 0) +
        s.data.products.length +
        s.data.productBarcodes.length +
        s.data.bills.length +
        s.data.billItems.length +
        s.data.returns.length +
        s.data.returnItems.length +
        s.data.recurringExpenses.length +
        s.data.expenses.length);
}
async function computePendingSince(lastSyncAt: Date | null): Promise<number> {
    if (!lastSyncAt)
        return Number.MAX_SAFE_INTEGER;
    const since = lastSyncAt;
    const [users, shopSettings, products, recurringExpenses, expenses, bills, returns,] = await Promise.all([
        prisma.user.count({ where: { updatedAt: { gt: since } } }),
        prisma.shopSettings.count({ where: { updatedAt: { gt: since } } }),
        prisma.product.count({ where: { updatedAt: { gt: since } } }),
        prisma.recurringExpense.count({ where: { updatedAt: { gt: since } } }),
        prisma.expense.count({ where: { updatedAt: { gt: since } } }),
        prisma.bill.count({ where: { createdAt: { gt: since } } }),
        prisma.return.count({ where: { createdAt: { gt: since } } }),
    ]);
    return (users +
        shopSettings +
        products +
        recurringExpenses +
        expenses +
        bills +
        returns);
}
async function restoreSnapshot(snapshot: BackupSnapshotV1): Promise<number> {
    const d = snapshot.data;
    const toDate = (s: string) => new Date(s);
    await prisma.$transaction([
        prisma.returnItem.deleteMany(),
        prisma.return.deleteMany(),
        prisma.billItem.deleteMany(),
        prisma.bill.deleteMany(),
        prisma.productBarcode.deleteMany(),
        prisma.product.deleteMany(),
        prisma.expense.deleteMany(),
        prisma.recurringExpense.deleteMany(),
        prisma.user.deleteMany(),
        prisma.shopSettings.deleteMany(),
    ]);
    await prisma.$transaction(async (tx) => {
        if (d.users.length) {
            await tx.user.createMany({
                data: d.users.map((u) => ({
                    id: u.id,
                    username: u.username,
                    password: u.password,
                    fullName: u.fullName,
                    role: u.role as Role,
                    isActive: u.isActive,
                    createdAt: toDate(u.createdAt),
                    updatedAt: toDate(u.updatedAt),
                })),
            });
        }
        if (d.shopSettings) {
            await tx.shopSettings.create({
                data: {
                    id: d.shopSettings.id,
                    shopName: d.shopSettings.shopName,
                    shopTagline: d.shopSettings.shopTagline,
                    receiptPhone: d.shopSettings.receiptPhone,
                    returnsEnabled: d.shopSettings.returnsEnabled,
                    returnRefundPercent: d.shopSettings.returnRefundPercent,
                    updatedAt: toDate(d.shopSettings.updatedAt),
                },
            });
        }
        if (d.products.length) {
            await tx.product.createMany({
                data: d.products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    purchaseCost: p.purchaseCost ?? 0,
                    stock: p.stock,
                    isActive: p.isActive,
                    createdAt: toDate(p.createdAt),
                    updatedAt: toDate(p.updatedAt),
                })),
            });
        }
        if (d.productBarcodes.length) {
            await tx.productBarcode.createMany({
                data: d.productBarcodes.map((b) => ({
                    id: b.id,
                    barcode: b.barcode,
                    productId: b.productId,
                    createdAt: toDate(b.createdAt),
                })),
            });
        }
        if (d.bills.length) {
            await tx.bill.createMany({
                data: d.bills.map((b) => ({
                    id: b.id,
                    billNumber: b.billNumber,
                    cashierId: b.cashierId,
                    subtotal: b.subtotal,
                    discountAmount: b.discountAmount,
                    total: b.total,
                    itemCount: b.itemCount,
                    status: b.status as BillStatus,
                    createdAt: toDate(b.createdAt),
                })),
            });
        }
        if (d.billItems.length) {
            await tx.billItem.createMany({
                data: d.billItems.map((i) => ({
                    id: i.id,
                    billId: i.billId,
                    productId: i.productId,
                    barcode: i.barcode,
                    name: i.name,
                    unitPrice: i.unitPrice,
                    unitCost: i.unitCost ?? 0,
                    quantity: i.quantity,
                    lineDiscount: i.lineDiscount ?? 0,
                    lineTotal: i.lineTotal,
                })),
            });
        }
        if (d.returns.length) {
            await tx.return.createMany({
                data: d.returns.map((r) => ({
                    id: r.id,
                    returnNumber: r.returnNumber,
                    billId: r.billId,
                    cashierId: r.cashierId,
                    refundAmount: r.refundAmount,
                    refundPercent: r.refundPercent,
                    itemCount: r.itemCount,
                    createdAt: toDate(r.createdAt),
                })),
            });
        }
        if (d.returnItems.length) {
            await tx.returnItem.createMany({
                data: d.returnItems.map((i) => ({
                    id: i.id,
                    returnId: i.returnId,
                    billItemId: i.billItemId,
                    productId: i.productId,
                    name: i.name,
                    barcode: i.barcode,
                    unitPrice: i.unitPrice,
                    quantity: i.quantity,
                    lineRefund: i.lineRefund,
                })),
            });
        }
        if (d.recurringExpenses.length) {
            await tx.recurringExpense.createMany({
                data: d.recurringExpenses.map((r) => ({
                    id: r.id,
                    title: r.title,
                    amount: r.amount,
                    category: r.category,
                    customCategory: r.customCategory,
                    payFrequency: r.payFrequency,
                    nextDueDate: toDate(r.nextDueDate),
                    remindDaysBefore: r.remindDaysBefore,
                    note: r.note,
                    isActive: r.isActive,
                    createdAt: toDate(r.createdAt),
                    updatedAt: toDate(r.updatedAt),
                })),
            });
        }
        if (d.expenses.length) {
            await tx.expense.createMany({
                data: d.expenses.map((e) => ({
                    id: e.id,
                    title: e.title,
                    amount: e.amount,
                    category: e.category,
                    customCategory: e.customCategory,
                    note: e.note,
                    expenseDate: toDate(e.expenseDate),
                    recurringExpenseId: e.recurringExpenseId,
                    createdAt: toDate(e.createdAt),
                    updatedAt: toDate(e.updatedAt),
                })),
            });
        }
    });
    return countSnapshotRecords(snapshot);
}
async function pullUsers(shopId: string): Promise<number> {
    const remoteUsers = await MongoUser.find({ shopId }).lean();
    let count = 0;
    for (const remote of remoteUsers) {
        const local = await prisma.user.findUnique({ where: { id: remote._id } });
        const remoteUpdated = new Date(remote.updatedAt);
        if (!local) {
            await prisma.user.create({
                data: {
                    id: remote._id,
                    username: remote.username,
                    password: remote.password,
                    fullName: remote.fullName,
                    role: remote.role as Role,
                    isActive: remote.isActive,
                    createdAt: remote.createdAt,
                    updatedAt: remoteUpdated,
                },
            });
            count++;
            continue;
        }
        if (remoteUpdated > local.updatedAt) {
            await prisma.user.update({
                where: { id: remote._id },
                data: {
                    username: remote.username,
                    password: remote.password,
                    fullName: remote.fullName,
                    role: remote.role as Role,
                    isActive: remote.isActive,
                    updatedAt: remoteUpdated,
                },
            });
            count++;
        }
    }
    return count;
}
async function pushUsers(shopId: string): Promise<number> {
    const localUsers = await prisma.user.findMany();
    let count = 0;
    for (const local of localUsers) {
        const remote = await MongoUser.findById(local.id).lean();
        const localUpdated = local.updatedAt;
        if (!remote) {
            await MongoUser.create({
                _id: local.id,
                shopId,
                username: local.username,
                password: local.password,
                fullName: local.fullName,
                role: local.role,
                isActive: local.isActive,
                createdAt: local.createdAt,
                updatedAt: localUpdated,
            });
            count++;
            continue;
        }
        const remoteUpdated = new Date(remote.updatedAt);
        if (localUpdated >= remoteUpdated) {
            await MongoUser.updateOne({ _id: local.id }, {
                $set: {
                    shopId,
                    username: local.username,
                    password: local.password,
                    fullName: local.fullName,
                    role: local.role,
                    isActive: local.isActive,
                    updatedAt: localUpdated,
                },
            });
            count++;
        }
    }
    return count;
}
export async function runInitialPullFromMongo(): Promise<SyncResult> {
    if (!isMongoConfigured()) {
        return {
            success: true,
            skipped: true,
            reason: "MongoDB not configured",
            pulled: 0,
            pushed: 0,
            syncedAt: new Date().toISOString(),
        };
    }
    const shopId = getShopId();
    try {
        await updateSyncMeta({ lastStatus: "syncing", lastError: null });
        const conn = await connectMongo();
        if (!conn) {
            throw new Error("Could not connect to MongoDB");
        }
        const backups = getBackupsCollection(conn);
        const latest = (await backups
            .find({ shopId, version: 1 })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray()) as Array<BackupSnapshotV1 & {
            _id?: unknown;
        }>;
        let pulled = 0;
        if (latest.length > 0) {
            pulled = await restoreSnapshot(latest[0]);
        }
        else {
            pulled = await pullUsers(shopId);
        }
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
export async function runFullSync(): Promise<SyncResult> {
    if (!isMongoConfigured()) {
        return {
            success: true,
            skipped: true,
            reason: "MongoDB not configured",
            pulled: 0,
            pushed: 0,
            syncedAt: new Date().toISOString(),
        };
    }
    const shopId = getShopId();
    try {
        await updateSyncMeta({ lastStatus: "syncing", lastError: null });
        const conn = await connectMongo();
        if (!conn) {
            throw new Error("Could not connect to MongoDB");
        }
        const snapshot = await buildSnapshot(shopId);
        const total = countSnapshotRecords(snapshot);
        const backups = getBackupsCollection(conn);
        await backups.insertOne(snapshot);
        const pushedUsers = await pushUsers(shopId);
        const pulled = 0;
        const pushed = Math.max(total, pushedUsers);
        const now = new Date();
        await updateSyncMeta({
            lastStatus: "success",
            lastError: null,
            lastPushAt: now,
            lastSyncAt: now,
            recordsPulled: pulled,
            recordsPushed: pushed,
        });
        return {
            success: true,
            pulled,
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
}> {
    const meta = await getOrCreateSyncMeta();
    const snapshot = await buildSnapshot(getShopId());
    const total = countSnapshotRecords(snapshot);
    const pendingRaw = await computePendingSince(meta.lastSyncAt ?? null);
    const pending = pendingRaw === Number.MAX_SAFE_INTEGER ? total : Math.min(total, pendingRaw);
    const percent = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round(((total - pending) / total) * 100)));
    return {
        configured: isMongoConfigured(),
        lastSyncAt: meta.lastSyncAt?.toISOString() ?? null,
        lastStatus: meta.lastStatus,
        lastError: meta.lastError,
        recordsPulled: meta.recordsPulled,
        recordsPushed: meta.recordsPushed,
        totalRecords: total,
        pendingRecords: pending,
        percentBackedUp: percent,
    };
}

