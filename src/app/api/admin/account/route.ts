import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { adminAccountSchema } from "@/lib/validations/account";
import { jsonError, jsonOk } from "@/lib/api-response";
export async function GET(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    const user = await prisma.user.findUnique({
        where: { id: admin.sub },
        select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
        },
    });
    if (!user || user.role !== "ADMIN") {
        return jsonError("Admin account not found", 404);
    }
    return jsonOk({
        success: true,
        account: {
            username: user.username,
            fullName: user.fullName,
        },
    });
}
export async function PATCH(request: Request) {
    const admin = await requireAdmin(request);
    if (!admin)
        return jsonError("Unauthorized", 401);
    try {
        const body = await request.json();
        const parsed = adminAccountSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const { currentPassword, username, newPassword } = parsed.data;
        const user = await prisma.user.findUnique({
            where: { id: admin.sub },
        });
        if (!user || user.role !== "ADMIN" || !user.isActive) {
            return jsonError("Admin account not found", 404);
        }
        const valid = await verifyPassword(currentPassword, user.password);
        if (!valid) {
            return jsonError("Current password is incorrect", 401);
        }
        if (username !== user.username) {
            const clash = await prisma.user.findUnique({ where: { username } });
            if (clash) {
                return jsonError("Username is already taken", 409);
            }
        }
        const data: {
            username: string;
            password?: string;
        } = { username };
        if (newPassword && newPassword.length >= 6) {
            data.password = await hashPassword(newPassword);
        }
        const updated = await prisma.user.update({
            where: { id: user.id },
            data,
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
            },
        });
        const token = await signAuthToken({
            sub: updated.id,
            username: updated.username,
            role: updated.role,
            fullName: updated.fullName,
        });
        return jsonOk({
            success: true,
            message: "Account updated",
            token,
            user: {
                id: updated.id,
                username: updated.username,
                fullName: updated.fullName,
                role: updated.role,
            },
        });
    }
    catch (error) {
        console.error("[admin account PATCH]", error);
        return jsonError("Failed to update account", 500);
    }
}

