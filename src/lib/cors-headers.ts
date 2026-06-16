import type { NextRequest } from "next/server";

/** Methods allowed from any client (Expo web, mobile, desktop, Vercel regions). */
export const CORS_ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD";

/** Headers clients may send (Authorization for JWT, etc.). */
export const CORS_ALLOW_HEADERS = [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
].join(", ");

/**
 * Build CORS headers for a request.
 * Reflects any Origin when present (works for localhost:8082, Expo, Vercel preview URLs, all regions).
 * Falls back to * when no Origin header (native apps, curl).
 */
export function buildCorsHeaders(request?: NextRequest | { headers: Headers } | null): Record<string, string> {
    const origin = request?.headers.get("origin")?.trim();
    return {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
        "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
        "Access-Control-Max-Age": "86400",
        ...(origin ? { "Vary": "Origin" } : {}),
    };
}

/** Static wildcard headers for next.config / vercel.json (no request context). */
export const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
};
