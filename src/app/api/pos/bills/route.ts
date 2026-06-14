import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { createBillSchema } from "@/lib/validations/bill";
import { generateBillNumber } from "@/lib/bills/bill-number";
import { periodStart, type BillPeriod } from "@/lib/bills/date-range";
import { jsonError, jsonOk } from "@/lib/api-response";
const billInclude = {
    items: { orderBy: { id: "asc" as const } },
    cashier: {
        select: { id: true, fullName: true, username: true },
    },
};
export async function GET(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    const { searchParams } = new URL(request.url);
    const isAdmin = user.role === "ADMIN";
    const maxLimit = isAdmin ? 500 : 100;
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), maxLimit);
    const q = (searchParams.get("q") ?? "").trim();
    const period = searchParams.get("period") as BillPeriod | null;
    const cashierId = searchParams.get("cashierId")?.trim() || undefined;
    const fromParam = searchParams.get("from")?.trim();
    const toParam = searchParams.get("to")?.trim();
    const roleFilter = user.role === "CASHIER" ? { cashierId: user.sub } : {};
    const cashierFilter = isAdmin && cashierId ? { cashierId } : {};
    let dateFilter: {
        createdAt?: {
            gte?: Date;
            lte?: Date;
        };
    } = {};
    if (fromParam || toParam) {
        dateFilter = {
            createdAt: {
                ...(fromParam ? { gte: new Date(fromParam) } : {}),
                ...(toParam ? { lte: new Date(toParam) } : {}),
            },
        };
    }
    else if (period &&
        (period === "day" ||
            period === "week" ||
            period === "month" ||
            period === "year")) {
        dateFilter = { createdAt: { gte: periodStart(period) } };
    }
    const searchFilter = q
        ? {
            OR: [
                { billNumber: { contains: q } },
                { id: { contains: q } },
                {
                    cashier: {
                        OR: [
                            { fullName: { contains: q } },
                            { username: { contains: q } },
                        ],
                    },
                },
            ],
        }
        : {};
    const bills = await prisma.bill.findMany({
        where: {
            ...roleFilter,
            ...cashierFilter,
            ...dateFilter,
            status: "COMPLETED",
            ...searchFilter,
        },
        include: billInclude,
        orderBy: { createdAt: "desc" },
        take: limit,
    });
    return jsonOk({ success: true, bills });
}
export async function POST(request: Request) {
    const user = await requireAuth(request);
    if (!user)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = createBillSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid cart", 400);
        }
        const { items, discountAmount = 0 } = parsed.data;
        const productIds = items.map((i) => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            include: { barcodes: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        if (products.length !== productIds.length) {
            return jsonError("One or more products not found", 404);
        }
        const productMap = new Map(products.map((p) => [p.id, p]));
        const lineData: {
            productId: string;
            barcode: string;
            name: string;
            unitPrice: number;
            unitCost: number;
            quantity: number;
            lineDiscount: number;
            lineTotal: number;
        }[] = [];
        let subtotal = 0;
        let itemCount = 0;
        for (const item of items) {
            const product = productMap.get(item.productId);
            if (!product)
                return jsonError("Product not found", 404);
            if (product.stock < item.quantity) {
                return jsonError(`Insufficient stock for "${product.name}" (${product.stock} left)`, 409);
            }
            const unitPrice = item.unitPrice ?? product.price;
            const lineName = item.name?.trim() || product.name;
            const grossLine = unitPrice * item.quantity;
            const lineDiscount = Math.min(item.lineDiscount ?? 0, grossLine);
            const lineTotal = grossLine - lineDiscount;
            subtotal += lineTotal;
            itemCount += item.quantity;
            lineData.push({
                productId: product.id,
                barcode: product.barcodes[0]?.barcode ?? "",
                name: lineName,
                unitPrice,
                unitCost: product.purchaseCost ?? 0,
                quantity: item.quantity,
                lineDiscount,
                lineTotal,
            });
        }
        const discount = Math.min(discountAmount, subtotal);
        const total = Math.max(0, subtotal - discount);
        const billNumber = await generateBillNumber();
        const bill = await prisma.$transaction(async (tx) => {
            for (const line of lineData) {
                await tx.product.update({
                    where: { id: line.productId },
                    data: { stock: { decrement: line.quantity } },
                });
            }
            return tx.bill.create({
                data: {
                    billNumber,
                    cashierId: user.sub,
                    subtotal,
                    discountAmount: discount,
                    total,
                    itemCount,
                    items: { create: lineData },
                },
                include: billInclude,
            });
        });
        return jsonOk({ success: true, bill }, 201);
    }
    catch (error) {
        console.error("[pos bills POST]", error);
        return jsonError("Failed to complete sale", 500);
    }
}

