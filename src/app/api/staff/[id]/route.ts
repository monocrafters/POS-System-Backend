import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cashierUpdateSchema } from "@/lib/validations/staff";
import { jsonError, jsonOk } from "@/lib/api-response";
import { triggerCloudBackup } from "@/lib/sync/trigger-cloud-backup";
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
type RouteCtx = {
    params: Promise<{
        id: string;
    }>;
};
export async function PATCH(request: Request, ctx: RouteCtx) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await ctx.params;
    try {
        const target = await prisma.user.findUnique({ where: { id } });
        if (!target || !target.isActive) {
            return jsonError("User not found", 404);
        }
        if (target.role !== "CASHIER") {
            return jsonError("Only cashiers can be edited", 403);
        }
        const body = await request.json();
        const parsed = cashierUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const { username, fullName, password } = parsed.data;
        if (username && username !== target.username) {
            const clash = await prisma.user.findUnique({ where: { username } });
            if (clash)
                return jsonError("Username already exists", 409);
        }
        const data: {
            username?: string;
            fullName?: string;
            password?: string;
        } = {};
        if (username)
            data.username = username;
        if (fullName)
            data.fullName = fullName;
        if (password && password.length >= 6) {
            data.password = await hashPassword(password);
        }
        const updated = await prisma.user.update({
            where: { id },
            data,
            select: staffSelect(),
        });
        triggerCloudBackup();
        return jsonOk({
            success: true,
            message: "Cashier updated successfully",
            user: updated,
        });
    }
    catch (error) {
        console.error("[staff PATCH]", error);
        return jsonError("Failed to update cashier", 500);
    }
}
export async function DELETE(request: Request, ctx: RouteCtx) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const { id } = await ctx.params;
    try {
        const target = await prisma.user.findUnique({ where: { id } });
        if (!target || !target.isActive) {
            return jsonError("User not found", 404);
        }
        if (target.role !== "CASHIER") {
            return jsonError("Cannot delete administrator account", 403);
        }
        await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
        triggerCloudBackup();
        return jsonOk({
            success: true,
            message: "Cashier removed successfully",
        });
    }
    catch (error) {
        console.error("[staff DELETE]", error);
        return jsonError("Failed to delete cashier", 500);
    }
}

