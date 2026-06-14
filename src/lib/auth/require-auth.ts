import { verifyAuthToken, type TokenPayload } from "@/lib/auth/jwt";
export async function requireAuth(request: Request): Promise<TokenPayload | null> {
    const header = request.headers.get("authorization");
    const token = header?.replace(/^Bearer\s+/i, "").trim();
    if (!token)
        return null;
    return verifyAuthToken(token);
}

