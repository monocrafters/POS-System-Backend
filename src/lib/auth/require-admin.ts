import { verifyAuthToken } from "@/lib/auth/jwt";
import type { TokenPayload } from "@/lib/auth/jwt";
export async function requireAdmin(request: Request): Promise<TokenPayload | null> {
    const header = request.headers.get("authorization");
    const token = header?.replace(/^Bearer\s+/i, "").trim();
    if (!token)
        return null;
    const payload = await verifyAuthToken(token);
    if (!payload || payload.role !== "ADMIN")
        return null;
    return payload;
}

