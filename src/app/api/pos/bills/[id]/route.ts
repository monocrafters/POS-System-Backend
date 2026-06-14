import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { jsonError, jsonOk } from "@/lib/api-response";
type RouteCtx = {
    params: Promise<{
        id: string;
    }>;
};
const billInclude = {
    items: { orderBy: { id: "asc" as const } },
    cashier: {
        select: { id: true, fullName: true, username: true },
    },
};
export async function GET(request: Request, ctx: RouteCtx) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const { id } = await ctx.params;
    const bill = await prisma.bill.findUnique({
        where: { id },
        include: billInclude,
    });
    if (!bill || bill.status !== "COMPLETED") {
        return jsonError("Bill not found", 404);
    }
    if (user.role === "CASHIER" && bill.cashierId !== user.sub) {
        return jsonError("Unauthorized", 403);
    }
    return jsonOk({ success: true, bill });
}
export async function DELETE(request: Request, ctx: RouteCtx) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const { id } = await ctx.params;
    const bill = await prisma.bill.findUnique({
        where: { id },
        include: { items: true, returns: { select: { id: true } } },
    });
    if (!bill || bill.status !== "COMPLETED") {
        return jsonError("Bill not found", 404);
    }
    if (user.role === "CASHIER" && bill.cashierId !== user.sub) {
        return jsonError("Unauthorized", 403);
    }
    if (bill.returns.length > 0) {
        return jsonError("Cannot delete a bill that has returns", 409);
    }
    try {
        await prisma.$transaction(async (tx) => {
            for (const line of bill.items) {
                await tx.product.update({
                    where: { id: line.productId },
                    data: { stock: { increment: line.quantity } },
                });
            }
            await tx.bill.delete({ where: { id } });
        });
        return jsonOk({ success: true, message: "Bill deleted" });
    }
    catch (error) {
        console.error("[pos bills DELETE]", error);
        return jsonError("Failed to delete bill", 500);
    }
}

