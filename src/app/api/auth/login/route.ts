import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validations/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        await ensureDatabaseReady();
        const body = await request.json();
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            return jsonError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
        }
        const { username, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.isActive) {
            return jsonError("Invalid username or password", 401);
        }
        const valid = await verifyPassword(password, user.password);
        if (!valid) {
            return jsonError("Invalid username or password", 401);
        }
        const token = await signAuthToken({
            sub: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName,
        });
        return jsonOk({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("[login]", error);
        return jsonError("Login failed", 500);
    }
}

