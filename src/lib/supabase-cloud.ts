import { Pool } from "pg";

const globalPool = globalThis as unknown as { pgPool?: Pool };

export function isCloudConfigured(): boolean {
    const uri = process.env.POSTGRES_URI?.trim();
    return Boolean(uri) && process.env.SYNC_ENABLED !== "false";
}

export function getCloudPool(): Pool | null {
    if (!isCloudConfigured()) return null;
    if (!globalPool.pgPool) {
        globalPool.pgPool = new Pool({
            connectionString: process.env.POSTGRES_URI!.trim(),
            ssl: { rejectUnauthorized: false },
            max: 4,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 12_000,
        });
    }
    return globalPool.pgPool;
}

const CLOUD_DDL = `
CREATE TABLE IF NOT EXISTS pos_users (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_users_shop ON pos_users(shop_id);

CREATE TABLE IF NOT EXISTS pos_products (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    purchase_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_products_shop ON pos_products(shop_id);

CREATE TABLE IF NOT EXISTS pos_product_barcodes (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    barcode TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_product_barcodes_shop ON pos_product_barcodes(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_product_barcodes_shop_barcode ON pos_product_barcodes(shop_id, barcode);

CREATE TABLE IF NOT EXISTS pos_bills (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    bill_number TEXT NOT NULL,
    cashier_id TEXT NOT NULL,
    subtotal DOUBLE PRECISION NOT NULL,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total DOUBLE PRECISION NOT NULL,
    item_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_bills_shop ON pos_bills(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_bills_shop_number ON pos_bills(shop_id, bill_number);

CREATE TABLE IF NOT EXISTS pos_bill_items (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    barcode TEXT NOT NULL,
    name TEXT NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL,
    unit_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL,
    line_discount DOUBLE PRECISION NOT NULL DEFAULT 0,
    line_total DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_bill_items_shop ON pos_bill_items(shop_id);

CREATE TABLE IF NOT EXISTS pos_returns (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    return_number TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    cashier_id TEXT NOT NULL,
    refund_amount DOUBLE PRECISION NOT NULL,
    refund_percent DOUBLE PRECISION NOT NULL,
    item_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_returns_shop ON pos_returns(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_returns_shop_number ON pos_returns(shop_id, return_number);

CREATE TABLE IF NOT EXISTS pos_return_items (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    return_id TEXT NOT NULL,
    bill_item_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    barcode TEXT NOT NULL,
    unit_price DOUBLE PRECISION NOT NULL,
    quantity INTEGER NOT NULL,
    line_refund DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_return_items_shop ON pos_return_items(shop_id);

CREATE TABLE IF NOT EXISTS pos_shop_settings (
    shop_id TEXT PRIMARY KEY,
    id TEXT NOT NULL DEFAULT 'global',
    shop_name TEXT NOT NULL,
    shop_tagline TEXT NOT NULL,
    receipt_phone TEXT,
    returns_enabled BOOLEAN NOT NULL DEFAULT true,
    return_refund_percent DOUBLE PRECISION NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_recurring_expenses (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    category TEXT NOT NULL,
    custom_category TEXT,
    pay_frequency TEXT NOT NULL,
    next_due_date TIMESTAMPTZ NOT NULL,
    remind_days_before INTEGER NOT NULL DEFAULT 3,
    note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_recurring_expenses_shop ON pos_recurring_expenses(shop_id);

CREATE TABLE IF NOT EXISTS pos_expenses (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    category TEXT NOT NULL,
    custom_category TEXT,
    note TEXT,
    expense_date TIMESTAMPTZ NOT NULL,
    recurring_expense_id TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_expenses_shop ON pos_expenses(shop_id);
`;

export async function ensureCloudTables(): Promise<void> {
    const pool = getCloudPool();
    if (!pool) return;
    await pool.query(CLOUD_DDL);
}

export async function checkCloudHealth(): Promise<{
    configured: boolean;
    connected: boolean;
    message: string;
    database: string | null;
    shopId: string | null;
    latencyMs: number | null;
}> {
    const shopId = process.env.SHOP_ID?.trim() || "bata-store-01";
    if (!isCloudConfigured()) {
        return {
            configured: false,
            connected: false,
            message: "Cloud database not configured (set POSTGRES_URI in server .env)",
            database: null,
            shopId,
            latencyMs: null,
        };
    }
    const start = Date.now();
    try {
        const pool = getCloudPool();
        if (!pool) throw new Error("Could not create database pool");
        await pool.query("SELECT 1");
        await ensureCloudTables();
        return {
            configured: true,
            connected: true,
            message: "Supabase PostgreSQL connected (relational tables)",
            database: "postgres",
            shopId,
            latencyMs: Date.now() - start,
        };
    }
    catch (error) {
        const raw = error instanceof Error ? error.message : "Cloud connection failed";
        let message = raw;
        if (raw.includes("ENOTFOUND") || raw.includes("getaddrinfo") || raw.includes("ENETUNREACH")) {
            message = "Supabase direct host unreachable (IPv6-only). Use Session pooler URI or run: node scripts/configure-supabase.mjs \"YOUR_DIRECT_URI\"";
        }
        return {
            configured: true,
            connected: false,
            message,
            database: null,
            shopId,
            latencyMs: Date.now() - start,
        };
    }
}

const WIPE_TABLES = [
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

export async function wipeCloudShop(shopId: string): Promise<void> {
    const pool = getCloudPool();
    if (!pool) throw new Error("Cloud database not configured");
    await ensureCloudTables();
    for (const table of WIPE_TABLES) {
        await pool.query(`DELETE FROM ${table} WHERE shop_id = $1`, [shopId]);
    }
}
