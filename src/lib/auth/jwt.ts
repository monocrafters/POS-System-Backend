import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/types/auth";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "pos-fallback-secret-change-me");
export interface TokenPayload {
    sub: string;
    username: string;
    role: UserRole;
    fullName: string;
}
export async function signAuthToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({
        username: payload.username,
        role: payload.role,
        fullName: payload.fullName,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(SECRET);
}
export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET);
        return {
            sub: payload.sub as string,
            username: payload.username as string,
            role: payload.role as UserRole,
            fullName: payload.fullName as string,
        };
    }
    catch {
        return null;
    }
}

