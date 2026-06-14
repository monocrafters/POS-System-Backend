import path from "path";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { ensureShopSettingsRow } from "@/lib/shop-settings";
import { isMongoConfigured } from "@/lib/mongodb";
import { runInitialPullFromMongo } from "@/lib/sync/sync-service";

let bootstrapPromise: Promise<void> | null = null;
let mongoPullPromise: Promise<void> | null = null;

function isVercelRuntime(): boolean {
    return Boolean(process.env.VERCEL);
}

function getTemplateDbCandidates(): string[] {
    const cwd = process.cwd();
    return [
        path.join(cwd, "prisma", "prisma", "pos.db"),
        path.join(cwd, "prisma", "pos.db"),
        path.join(cwd, "..", "prisma", "prisma", "pos.db"),
        path.join(cwd, "..", "prisma", "pos.db"),
        path.join(cwd, "..", "..", "prisma", "prisma", "pos.db"),
        path.join(cwd, "..", "..", "prisma", "pos.db"),
    ];
}

async function hasColumn(table: string, column: string): Promise<boolean> {
    try {
        const rows = (await prisma.$queryRawUnsafe(
            `SELECT name FROM pragma_table_info('${table}') WHERE name='${column}' LIMIT 1;`,
        )) as Array<{ name: string }>;
        return rows.length > 0;
    }
    catch {
        return false;
    }
}

async function hasTable(table: string): Promise<boolean> {
    try {
        const rows = (await prisma.$queryRawUnsafe(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}' LIMIT 1;`,
        )) as Array<{ name: string }>;
        return rows.length > 0;
    }
    catch {
        return false;
    }
}

async function isSchemaCurrent(): Promise<boolean> {
    const checks = await Promise.all([
        hasTable("ShopSettings"),
        hasTable("SyncMeta"),
        hasColumn("Product", "purchaseCost"),
        hasColumn("BillItem", "unitCost"),
    ]);
    return checks.every(Boolean);
}

async function pushSqliteSchema(): Promise<void> {
    const { spawnSync } = await import("child_process");
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const res = spawnSync(cmd, ["prisma", "db", "push", "--skip-generate"], {
        cwd: process.cwd(),
        env: process.env,
        stdio: "pipe",
        shell: false,
    });
    if (res.status !== 0) {
        const detail = res.stderr?.toString() || res.stdout?.toString() || "unknown error";
        throw new Error(`prisma db push failed: ${detail}`);
    }
}

export async function ensureSqliteSchema(): Promise<void> {
    if (await isSchemaCurrent()) {
        return;
    }
    console.log("[bootstrap-db] Schema out of date — running prisma db push");
    await pushSqliteSchema();
    if (!(await isSchemaCurrent())) {
        throw new Error("Database schema could not be updated. Run `npm run db:push` and restart.");
    }
}

async function ensureVercelDatabaseFile(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl.startsWith("file:/tmp/")) {
        return;
    }
    const fs = await import("fs");
    const targetPath = dbUrl.replace("file:", "");
    if (fs.existsSync(targetPath)) {
        return;
    }
    const srcPath = getTemplateDbCandidates().find((candidate) => fs.existsSync(candidate));
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    if (srcPath) {
        fs.copyFileSync(srcPath, targetPath);
        console.log(`[bootstrap-db] Copied template DB from ${srcPath} to ${targetPath}`);
        return;
    }
    console.warn("[bootstrap-db] Template DB not found; creating schema on Vercel /tmp database");
    await pushSqliteSchema();
}

async function seedDefaultUsers(): Promise<void> {
    const adminExists = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
    });
    if (adminExists === 0) {
        const adminPass = await hashPassword("admin123");
        await prisma.user.create({
            data: {
                username: "admin",
                password: adminPass,
                fullName: "Store Admin",
                role: "ADMIN",
                isActive: true,
            },
        });
    }
    const cashierExists = await prisma.user.findUnique({
        where: { username: "cashier" },
    });
    if (!cashierExists) {
        const cashierPass = await hashPassword("cashier123");
        await prisma.user.create({
            data: {
                username: "cashier",
                password: cashierPass,
                fullName: "Counter Cashier",
                role: "CASHIER",
                isActive: true,
            },
        });
    }
}

/** Pull latest MongoDB backup into SQLite — never blocks login/API responses. */
export function pullMongoBackupInBackground(): void {
    if (!isMongoConfigured()) return;
    if (mongoPullPromise) return;
    mongoPullPromise = (async () => {
        try {
            await runInitialPullFromMongo();
        }
        catch (error) {
            console.warn("[bootstrap-db] Mongo backup pull skipped:", error);
        }
    })().finally(() => {
        mongoPullPromise = null;
    });
}

export async function ensureDatabaseReady(): Promise<void> {
    await ensureSqliteSchema();

    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            if (isVercelRuntime()) {
                await ensureVercelDatabaseFile();
            }
            await ensureSqliteSchema();
            await ensureShopSettingsRow();
            await prisma.productBarcode.deleteMany({
                where: { product: { isActive: false } },
            });

            const userCount = await prisma.user.count();
            if (userCount === 0) {
                await seedDefaultUsers();
            }
        })().catch((err) => {
            bootstrapPromise = null;
            throw err;
        });
    }

    await bootstrapPromise;
    pullMongoBackupInBackground();
}
