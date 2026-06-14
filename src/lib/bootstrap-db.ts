import path from "path";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { ensureShopSettingsRow } from "@/lib/shop-settings";
import { isMongoConfigured } from "@/lib/mongodb";
import { runInitialPullFromMongo } from "@/lib/sync/sync-service";

let bootstrapPromise: Promise<void> | null = null;

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

async function hasShopSettingsTable(): Promise<boolean> {
    try {
        const rows = (await prisma.$queryRawUnsafe(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='ShopSettings' LIMIT 1;",
        )) as Array<{ name: string }>;
        return rows.length > 0;
    }
    catch {
        return false;
    }
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

async function ensureSqliteSchema(): Promise<void> {
    if (await hasShopSettingsTable()) {
        return;
    }
    if (!isVercelRuntime() && process.env.NODE_ENV === "production") {
        throw new Error("Database schema is missing on production runtime.");
    }
    await pushSqliteSchema();
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

export async function ensureDatabaseReady(): Promise<void> {
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

            // MongoDB is for optional admin backup sync on desktop — never block Vercel login.
            const meta = await prisma.syncMeta.findUnique({ where: { id: "global" } });
            const isFirstRun = !meta?.lastPullAt;
            if (isFirstRun && isMongoConfigured() && !isVercelRuntime()) {
                try {
                    await runInitialPullFromMongo();
                }
                catch (error) {
                    console.warn("[bootstrap-db] Mongo backup pull skipped:", error);
                }
            }

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
}
