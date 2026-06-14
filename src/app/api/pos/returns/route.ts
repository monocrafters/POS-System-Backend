import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { createReturnSchema } from "@/lib/validations/return";
import { generateReturnNumber } from "@/lib/returns/return-number";
import { getReturnableQty } from "@/lib/returns/bill-returnable";
import { getEffectiveUnitPrice, getLineRefundAmount } from "@/lib/returns/refund-pricing";
import { getReturnSettings } from "@/lib/shop-settings";
import { jsonError, jsonOk } from "@/lib/api-response";
const returnInclude = {
    items: { orderBy: { id: "asc" as const } },
    bill: { select: { billNumber: true } },
    cashier: { select: { id: true, fullName: true, username: true } },
};
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 40), 100);
    const where = user.role === "CASHIER" ? { cashierId: user.sub } : {};
    const returns = await prisma.return.findMany({
        where,
        include: returnInclude,
        orderBy: { createdAt: "desc" },
        take: limit,
    });
    return jsonOk({ success: true, returns });
}
export async function POST(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const settings = await getReturnSettings();
    if (!settings.returnsEnabled) {
        return jsonError("Returns are disabled", 403);
    }
    try {
        const body = await request.json();
        const parsed = createReturnSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const { billId, items } = parsed.data;
        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: {
                items: { include: { returnItems: true } },
            },
        });
        if (!bill || bill.status !== "COMPLETED") {
            return jsonError("Bill not found", 404);
        }
        if (user.role === "CASHIER" && bill.cashierId !== user.sub) {
            return jsonError("Unauthorized", 403);
        }
        const itemMap = new Map(bill.items.map((i) => [i.id, i]));
        const lineData: {
            billItemId: string;
            productId: string;
            name: string;
            barcode: string;
            unitPrice: number;
            quantity: number;
            lineRefund: number;
        }[] = [];
        let refundSubtotal = 0;
        let itemCount = 0;
        for (const row of items) {
            const billItem = itemMap.get(row.billItemId);
            if (!billItem)
                return jsonError("Invalid bill item", 400);
            const returnable = getReturnableQty(billItem);
            if (row.quantity > returnable) {
                return jsonError(`Cannot return ${row.quantity} of "${billItem.name}" (max ${returnable})`, 409);
            }
            const lineRefund = getLineRefundAmount(billItem, bill, row.quantity, settings.returnRefundPercent);
            const effectiveUnit = getEffectiveUnitPrice(billItem, bill);
            refundSubtotal += lineRefund;
            itemCount += row.quantity;
            lineData.push({
                billItemId: billItem.id,
                productId: billItem.productId,
                name: billItem.name,
                barcode: billItem.barcode,
                unitPrice: effectiveUnit,
                quantity: row.quantity,
                lineRefund,
            });
        }
        if (lineData.length === 0) {
            return jsonError("No items to return", 400);
        }
        const returnNumber = await generateReturnNumber();
        const created = await prisma.$transaction(async (tx) => {
            for (const line of lineData) {
                await tx.product.update({
                    where: { id: line.productId },
                    data: { stock: { increment: line.quantity } },
                });
            }
            return tx.return.create({
                data: {
                    returnNumber,
                    billId: bill.id,
                    cashierId: user.sub,
                    refundAmount: refundSubtotal,
                    refundPercent: settings.returnRefundPercent,
                    itemCount,
                    items: { create: lineData },
                },
                include: returnInclude,
            });
        });
        return jsonOk({ success: true, return: created }, 201);
    }
    catch (error) {
        console.error("[returns POST]", error);
        return jsonError("Failed to process return", 500);
    }
}

