import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { ensureShopSettingsRow } from "@/lib/shop-settings";
import { isMongoConfigured } from "@/lib/mongodb";
import { runInitialPullFromMongo } from "@/lib/sync/sync-service";
let bootstrapPromise: Promise<void> | null = null;
async function ensureSqliteSchemaInDev(): Promise<void> {
    if (process.env.NODE_ENV === "production")
        return;
    try {
        const rows = (await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name='ShopSettings' LIMIT 1;")) as Array<{
            name: string;
        }>;
        if (rows.length > 0)
            return;
    }
    catch {
    }
    try {
        const { spawnSync } = await import("child_process");
        const res = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "db", "push", "--skip-generate"], {
            stdio: "inherit",
            shell: false,
        });
        if (res.status !== 0) {
            throw new Error("prisma db push failed");
        }
    }
    catch (e) {
        throw new Error("Database schema is missing. Run `npm run db:push` (or `npx prisma db push`) and restart the app.");
    }
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
            await ensureSqliteSchemaInDev();
            await ensureShopSettingsRow();
            await prisma.productBarcode.deleteMany({
                where: { product: { isActive: false } },
            });
            const meta = await prisma.syncMeta.findUnique({ where: { id: "global" } });
            const isFirstRun = !meta?.lastPullAt;
            if (isFirstRun && isMongoConfigured()) {
                await runInitialPullFromMongo();
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

