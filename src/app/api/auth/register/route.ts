import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import type { Role } from "@prisma/client";
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const { username, password, fullName, role } = parsed.data;
        if (role === "ADMIN") {
            return jsonError("A new administrator cannot be registered. Sign in with the store admin account that was set up for this system.", 403);
        }
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return jsonError("Username already exists", 409);
        }
        const hashed = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                username,
                password: hashed,
                fullName,
                role: role as Role,
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                role: true,
            },
        });
        import("@/lib/sync/sync-service")
            .then(({ runFullSync }) => runFullSync())
            .catch(console.error);
        return jsonOk({
            success: true,
            message: `${role} registered successfully`,
            user,
        }, 201);
    }
    catch (error) {
        console.error("[register]", error);
        return jsonError("Registration failed", 500);
    }
}

