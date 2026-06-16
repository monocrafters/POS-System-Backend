import { runInitialPullFromCloud } from "@/lib/sync/sync-service";
import { jsonError, jsonOk } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const productInclude = {
    barcodes: { orderBy: { createdAt: "asc" as const } },
};

export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        await ensureDatabaseReady();
        const result = await runInitialPullFromCloud();
        if (!result.success && !result.skipped) {
            return jsonError(result.error ?? "Fetch from cloud failed", 500);
        }
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: productInclude,
            orderBy: { updatedAt: "desc" },
        });
        return jsonOk({ ...result, products });
    }
    catch (error) {
        console.error("[sync/pull]", error);
        return jsonError(error instanceof Error ? error.message : "Fetch from cloud failed", 500);
    }
}
