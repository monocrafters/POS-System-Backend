import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").toLowerCase().trim();
    if (!q) {
        return jsonOk({
            success: true,
            query: "",
            cashiers: [],
            products: [],
            bills: [],
        });
    }
    const cashiers = await prisma.user.findMany({
        where: {
            isActive: true,
            role: "CASHIER",
            OR: [
                { username: { contains: q } },
                { fullName: { contains: q } },
            ],
        },
        select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
        take: 50,
        orderBy: { fullName: "asc" },
    });
    const productsRaw = await prisma.product.findMany({
        where: {
            isActive: true,
            OR: [
                { name: { contains: q } },
                { barcodes: { some: { barcode: { contains: q } } } },
            ],
        },
        select: { id: true, name: true, barcodes: { take: 1, select: { barcode: true } } },
        take: 20,
        orderBy: { name: "asc" },
    });
    const products = productsRaw.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.barcodes[0]?.barcode,
    }));
    const billsRaw = await prisma.bill.findMany({
        where: {
            status: "COMPLETED",
            OR: [
                { billNumber: { contains: q } },
                {
                    cashier: {
                        OR: [
                            { fullName: { contains: q } },
                            { username: { contains: q } },
                        ],
                    },
                },
            ],
        },
        select: {
            id: true,
            billNumber: true,
            total: true,
            cashier: { select: { fullName: true } },
        },
        take: 15,
        orderBy: { createdAt: "desc" },
    });
    const bills = billsRaw.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        label: `${b.billNumber} · ${b.cashier.fullName} · Rs ${b.total.toLocaleString("en-PK")}`,
    }));
    return jsonOk({
        success: true,
        query: q,
        cashiers,
        products,
        bills,
        totalResults: cashiers.length + products.length + bills.length,
    });
}

