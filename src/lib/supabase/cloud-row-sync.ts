import type { PoolClient } from "pg";
import { prisma } from "@/lib/prisma";
import type { BillStatus, Role } from "@prisma/client";
import { ensureCloudTables, getCloudPool } from "@/lib/supabase-cloud";

const CLOUD_TABLES = [
    "pos_return_items",
    "pos_returns",
    "pos_bill_items",
    "pos_bills",
    "pos_product_barcodes",
    "pos_products",
    "pos_expenses",
    "pos_recurring_expenses",
    "pos_shop_settings",
    "pos_users",
] as const;

async function deleteOrphans(
    client: PoolClient,
    shopId: string,
    table: string,
    ids: string[],
): Promise<void> {
    if (ids.length === 0) {
        await client.query(`DELETE FROM ${table} WHERE shop_id = $1`, [shopId]);
        return;
    }
    await client.query(`DELETE FROM ${table} WHERE shop_id = $1 AND NOT (id = ANY($2::text[]))`, [
        shopId,
        ids,
    ]);
}

async function deleteShopSettingsOrphans(client: PoolClient, shopId: string, hasRow: boolean): Promise<void> {
    if (!hasRow) {
        await client.query("DELETE FROM pos_shop_settings WHERE shop_id = $1", [shopId]);
    }
}

export async function countShopCloudRecords(shopId: string): Promise<number> {
    await ensureCloudTables();
    const pool = getCloudPool();
    if (!pool) return 0;
    let total = 0;
    for (const table of CLOUD_TABLES) {
        const res = await pool.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM ${table} WHERE shop_id = $1`,
            [shopId],
        );
        total += Number(res.rows[0]?.count ?? 0);
    }
    return total;
}

export async function pushShopToCloud(shopId: string): Promise<number> {
    await ensureCloudTables();
    const pool = getCloudPool();
    if (!pool) throw new Error("Cloud database not configured");

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
        prisma.user.findMany({ where: { isActive: true } }),
        prisma.shopSettings.findUnique({ where: { id: "global" } }),
        prisma.product.findMany({ where: { isActive: true }, include: { barcodes: true } }),
        prisma.productBarcode.findMany({
            where: { product: { isActive: true } },
        }),
        prisma.bill.findMany(),
        prisma.billItem.findMany(),
        prisma.return.findMany(),
        prisma.returnItem.findMany(),
        prisma.recurringExpense.findMany({ where: { isActive: true } }),
        prisma.expense.findMany(),
    ]);

    const client = await pool.connect();
    let pushed = 0;
    try {
        await client.query("BEGIN");

        for (const u of users) {
            await client.query(
                `INSERT INTO pos_users
                 (id, shop_id, username, password, full_name, role, is_active, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (id) DO UPDATE SET
                   shop_id = EXCLUDED.shop_id,
                   username = EXCLUDED.username,
                   password = EXCLUDED.password,
                   full_name = EXCLUDED.full_name,
                   role = EXCLUDED.role,
                   is_active = EXCLUDED.is_active,
                   updated_at = EXCLUDED.updated_at`,
                [u.id, shopId, u.username, u.password, u.fullName, u.role, u.isActive, u.createdAt, u.updatedAt],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_users", users.map((u) => u.id));

        if (shopSettings) {
            await client.query(
                `INSERT INTO pos_shop_settings
                 (shop_id, id, shop_name, shop_tagline, receipt_phone, returns_enabled, return_refund_percent, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                 ON CONFLICT (shop_id) DO UPDATE SET
                   shop_name = EXCLUDED.shop_name,
                   shop_tagline = EXCLUDED.shop_tagline,
                   receipt_phone = EXCLUDED.receipt_phone,
                   returns_enabled = EXCLUDED.returns_enabled,
                   return_refund_percent = EXCLUDED.return_refund_percent,
                   updated_at = EXCLUDED.updated_at`,
                [
                    shopId,
                    shopSettings.id,
                    shopSettings.shopName,
                    shopSettings.shopTagline,
                    shopSettings.receiptPhone,
                    shopSettings.returnsEnabled,
                    shopSettings.returnRefundPercent,
                    shopSettings.updatedAt,
                ],
            );
            pushed++;
        }
        await deleteShopSettingsOrphans(client, shopId, Boolean(shopSettings));

        for (const p of products) {
            await client.query(
                `INSERT INTO pos_products
                 (id, shop_id, name, price, purchase_cost, stock, is_active, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (id) DO UPDATE SET
                   shop_id = EXCLUDED.shop_id,
                   name = EXCLUDED.name,
                   price = EXCLUDED.price,
                   purchase_cost = EXCLUDED.purchase_cost,
                   stock = EXCLUDED.stock,
                   is_active = EXCLUDED.is_active,
                   updated_at = EXCLUDED.updated_at`,
                [p.id, shopId, p.name, p.price, p.purchaseCost, p.stock, p.isActive, p.createdAt, p.updatedAt],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_products", products.map((p) => p.id));

        for (const b of barcodes) {
            await client.query(
                `INSERT INTO pos_product_barcodes
                 (id, shop_id, barcode, product_id, created_at)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (id) DO UPDATE SET
                   shop_id = EXCLUDED.shop_id,
                   barcode = EXCLUDED.barcode,
                   product_id = EXCLUDED.product_id`,
                [b.id, shopId, b.barcode, b.productId, b.createdAt],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_product_barcodes", barcodes.map((b) => b.id));

        for (const b of bills) {
            await client.query(
                `INSERT INTO pos_bills
                 (id, shop_id, bill_number, cashier_id, subtotal, discount_amount, total, item_count, status, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (id) DO UPDATE SET
                   bill_number = EXCLUDED.bill_number,
                   cashier_id = EXCLUDED.cashier_id,
                   subtotal = EXCLUDED.subtotal,
                   discount_amount = EXCLUDED.discount_amount,
                   total = EXCLUDED.total,
                   item_count = EXCLUDED.item_count,
                   status = EXCLUDED.status`,
                [
                    b.id,
                    shopId,
                    b.billNumber,
                    b.cashierId,
                    b.subtotal,
                    b.discountAmount,
                    b.total,
                    b.itemCount,
                    b.status,
                    b.createdAt,
                ],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_bills", bills.map((b) => b.id));

        for (const i of billItems) {
            await client.query(
                `INSERT INTO pos_bill_items
                 (id, shop_id, bill_id, product_id, barcode, name, unit_price, unit_cost, quantity, line_discount, line_total)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT (id) DO UPDATE SET
                   bill_id = EXCLUDED.bill_id,
                   product_id = EXCLUDED.product_id,
                   barcode = EXCLUDED.barcode,
                   name = EXCLUDED.name,
                   unit_price = EXCLUDED.unit_price,
                   unit_cost = EXCLUDED.unit_cost,
                   quantity = EXCLUDED.quantity,
                   line_discount = EXCLUDED.line_discount,
                   line_total = EXCLUDED.line_total`,
                [
                    i.id,
                    shopId,
                    i.billId,
                    i.productId,
                    i.barcode,
                    i.name,
                    i.unitPrice,
                    i.unitCost,
                    i.quantity,
                    i.lineDiscount,
                    i.lineTotal,
                ],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_bill_items", billItems.map((i) => i.id));

        for (const r of returns) {
            await client.query(
                `INSERT INTO pos_returns
                 (id, shop_id, return_number, bill_id, cashier_id, refund_amount, refund_percent, item_count, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (id) DO UPDATE SET
                   return_number = EXCLUDED.return_number,
                   bill_id = EXCLUDED.bill_id,
                   cashier_id = EXCLUDED.cashier_id,
                   refund_amount = EXCLUDED.refund_amount,
                   refund_percent = EXCLUDED.refund_percent,
                   item_count = EXCLUDED.item_count`,
                [
                    r.id,
                    shopId,
                    r.returnNumber,
                    r.billId,
                    r.cashierId,
                    r.refundAmount,
                    r.refundPercent,
                    r.itemCount,
                    r.createdAt,
                ],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_returns", returns.map((r) => r.id));

        for (const i of returnItems) {
            await client.query(
                `INSERT INTO pos_return_items
                 (id, shop_id, return_id, bill_item_id, product_id, name, barcode, unit_price, quantity, line_refund)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (id) DO UPDATE SET
                   return_id = EXCLUDED.return_id,
                   bill_item_id = EXCLUDED.bill_item_id,
                   product_id = EXCLUDED.product_id,
                   name = EXCLUDED.name,
                   barcode = EXCLUDED.barcode,
                   unit_price = EXCLUDED.unit_price,
                   quantity = EXCLUDED.quantity,
                   line_refund = EXCLUDED.line_refund`,
                [
                    i.id,
                    shopId,
                    i.returnId,
                    i.billItemId,
                    i.productId,
                    i.name,
                    i.barcode,
                    i.unitPrice,
                    i.quantity,
                    i.lineRefund,
                ],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_return_items", returnItems.map((i) => i.id));

        for (const r of recurringExpenses) {
            await client.query(
                `INSERT INTO pos_recurring_expenses
                 (id, shop_id, title, amount, category, custom_category, pay_frequency, next_due_date,
                  remind_days_before, note, is_active, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                 ON CONFLICT (id) DO UPDATE SET
                   title = EXCLUDED.title,
                   amount = EXCLUDED.amount,
                   category = EXCLUDED.category,
                   custom_category = EXCLUDED.custom_category,
                   pay_frequency = EXCLUDED.pay_frequency,
                   next_due_date = EXCLUDED.next_due_date,
                   remind_days_before = EXCLUDED.remind_days_before,
                   note = EXCLUDED.note,
                   is_active = EXCLUDED.is_active,
                   updated_at = EXCLUDED.updated_at`,
                [
                    r.id,
                    shopId,
                    r.title,
                    r.amount,
                    r.category,
                    r.customCategory,
                    r.payFrequency,
                    r.nextDueDate,
                    r.remindDaysBefore,
                    r.note,
                    r.isActive,
                    r.createdAt,
                    r.updatedAt,
                ],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_recurring_expenses", recurringExpenses.map((r) => r.id));

        for (const e of expenses) {
            await client.query(
                `INSERT INTO pos_expenses
                 (id, shop_id, title, amount, category, custom_category, note, expense_date,
                  recurring_expense_id, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT (id) DO UPDATE SET
                   title = EXCLUDED.title,
                   amount = EXCLUDED.amount,
                   category = EXCLUDED.category,
                   custom_category = EXCLUDED.custom_category,
                   note = EXCLUDED.note,
                   expense_date = EXCLUDED.expense_date,
                   recurring_expense_id = EXCLUDED.recurring_expense_id,
                   updated_at = EXCLUDED.updated_at`,
                [
                    e.id,
                    shopId,
                    e.title,
                    e.amount,
                    e.category,
                    e.customCategory,
                    e.note,
                    e.expenseDate,
                    e.recurringExpenseId,
                    e.createdAt,
                    e.updatedAt,
                ],
            );
            pushed++;
        }
        await deleteOrphans(client, shopId, "pos_expenses", expenses.map((e) => e.id));

        await client.query("COMMIT");
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }

    return pushed;
}

type CloudUser = {
    id: string;
    username: string;
    password: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
};

export async function pullShopFromCloud(shopId: string): Promise<number> {
    await ensureCloudTables();
    const pool = getCloudPool();
    if (!pool) throw new Error("Cloud database not configured");

    const [
        usersRes,
        settingsRes,
        productsRes,
        barcodesRes,
        billsRes,
        billItemsRes,
        returnsRes,
        returnItemsRes,
        recurringRes,
        expensesRes,
    ] = await Promise.all([
        pool.query<CloudUser>("SELECT * FROM pos_users WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_shop_settings WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_products WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_product_barcodes WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_bills WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_bill_items WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_returns WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_return_items WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_recurring_expenses WHERE shop_id = $1", [shopId]),
        pool.query("SELECT * FROM pos_expenses WHERE shop_id = $1", [shopId]),
    ]);

    const users = usersRes.rows;
    const shopSettings = settingsRes.rows[0] ?? null;
    const products = productsRes.rows;
    const barcodes = barcodesRes.rows;
    const bills = billsRes.rows;
    const billItems = billItemsRes.rows;
    const returns = returnsRes.rows;
    const returnItems = returnItemsRes.rows;
    const recurringExpenses = recurringRes.rows;
    const expenses = expensesRes.rows;

    const total =
        users.length +
        (shopSettings ? 1 : 0) +
        products.length +
        barcodes.length +
        bills.length +
        billItems.length +
        returns.length +
        returnItems.length +
        recurringExpenses.length +
        expenses.length;

    if (total === 0) return 0;

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
        if (users.length) {
            await tx.user.createMany({
                data: users.map((u) => ({
                    id: u.id,
                    username: u.username,
                    password: u.password,
                    fullName: u.full_name,
                    role: u.role as Role,
                    isActive: u.is_active,
                    createdAt: u.created_at,
                    updatedAt: u.updated_at,
                })),
            });
        }
        if (shopSettings) {
            await tx.shopSettings.create({
                data: {
                    id: shopSettings.id,
                    shopName: shopSettings.shop_name,
                    shopTagline: shopSettings.shop_tagline,
                    receiptPhone: shopSettings.receipt_phone,
                    returnsEnabled: shopSettings.returns_enabled,
                    returnRefundPercent: shopSettings.return_refund_percent,
                    updatedAt: shopSettings.updated_at,
                },
            });
        }
        if (products.length) {
            await tx.product.createMany({
                data: products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.price),
                    purchaseCost: Number(p.purchase_cost),
                    stock: Number(p.stock),
                    isActive: p.is_active,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                })),
            });
        }
        if (barcodes.length) {
            await tx.productBarcode.createMany({
                data: barcodes.map((b) => ({
                    id: b.id,
                    barcode: b.barcode,
                    productId: b.product_id,
                    createdAt: b.created_at,
                })),
            });
        }
        if (bills.length) {
            await tx.bill.createMany({
                data: bills.map((b) => ({
                    id: b.id,
                    billNumber: b.bill_number,
                    cashierId: b.cashier_id,
                    subtotal: Number(b.subtotal),
                    discountAmount: Number(b.discount_amount),
                    total: Number(b.total),
                    itemCount: Number(b.item_count),
                    status: b.status as BillStatus,
                    createdAt: b.created_at,
                })),
            });
        }
        if (billItems.length) {
            await tx.billItem.createMany({
                data: billItems.map((i) => ({
                    id: i.id,
                    billId: i.bill_id,
                    productId: i.product_id,
                    barcode: i.barcode,
                    name: i.name,
                    unitPrice: Number(i.unit_price),
                    unitCost: Number(i.unit_cost),
                    quantity: Number(i.quantity),
                    lineDiscount: Number(i.line_discount),
                    lineTotal: Number(i.line_total),
                })),
            });
        }
        if (returns.length) {
            await tx.return.createMany({
                data: returns.map((r) => ({
                    id: r.id,
                    returnNumber: r.return_number,
                    billId: r.bill_id,
                    cashierId: r.cashier_id,
                    refundAmount: Number(r.refund_amount),
                    refundPercent: Number(r.refund_percent),
                    itemCount: Number(r.item_count),
                    createdAt: r.created_at,
                })),
            });
        }
        if (returnItems.length) {
            await tx.returnItem.createMany({
                data: returnItems.map((i) => ({
                    id: i.id,
                    returnId: i.return_id,
                    billItemId: i.bill_item_id,
                    productId: i.product_id,
                    name: i.name,
                    barcode: i.barcode,
                    unitPrice: Number(i.unit_price),
                    quantity: Number(i.quantity),
                    lineRefund: Number(i.line_refund),
                })),
            });
        }
        if (recurringExpenses.length) {
            await tx.recurringExpense.createMany({
                data: recurringExpenses.map((r) => ({
                    id: r.id,
                    title: r.title,
                    amount: Number(r.amount),
                    category: r.category,
                    customCategory: r.custom_category,
                    payFrequency: r.pay_frequency,
                    nextDueDate: r.next_due_date,
                    remindDaysBefore: Number(r.remind_days_before),
                    note: r.note,
                    isActive: r.is_active,
                    createdAt: r.created_at,
                    updatedAt: r.updated_at,
                })),
            });
        }
        if (expenses.length) {
            await tx.expense.createMany({
                data: expenses.map((e) => ({
                    id: e.id,
                    title: e.title,
                    amount: Number(e.amount),
                    category: e.category,
                    customCategory: e.custom_category,
                    note: e.note,
                    expenseDate: e.expense_date,
                    recurringExpenseId: e.recurring_expense_id,
                    createdAt: e.created_at,
                    updatedAt: e.updated_at,
                })),
            });
        }
    });

    return total;
}
