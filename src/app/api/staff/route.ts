import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cashierRegisterSchema } from "@/lib/validations/staff";
import { jsonError, jsonOk } from "@/lib/api-response";
function staffSelect() {
    return {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
    } as const;
}
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) {
        return jsonError("Unauthorized. Admin access required.", 401);
    }
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: staffSelect(),
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    });
    const storeAdmin = users.find((u) => u.role === "ADMIN") ?? null;
    const cashiers = users.filter((u) => u.role === "CASHIER");
    return jsonOk({
        success: true,
        storeAdmin,
        cashiers,
        cashierCount: cashiers.length,
        canRegisterAdmin: false,
        message: storeAdmin && storeAdmin.id !== admin.sub
            ? "Another administrator exists for this store"
            : undefined,
    });
}
export async function POST(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin) {
        return jsonError("Unauthorized. Admin access required.", 401);
    }
    try {
        const body = await request.json();
        const parsed = cashierRegisterSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const { username, password, fullName } = parsed.data;
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return jsonError("Username already exists", 409);
        }
        const hashed = await hashPassword(password);
        const cashier = await prisma.user.create({
            data: {
                username,
                password: hashed,
                fullName,
                role: "CASHIER",
            },
            select: staffSelect(),
        });
        import("@/lib/sync/sync-service")
            .then(({ runFullSync }) => runFullSync())
            .catch(console.error);
        return jsonOk({
            success: true,
            message: "Cashier registered successfully",
            user: cashier,
        }, 201);
    }
    catch (error) {
        console.error("[staff POST]", error);
        return jsonError("Failed to register cashier", 500);
    }
}

