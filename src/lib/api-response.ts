import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/cors-headers";

function withCors(init?: ResponseInit): ResponseInit {
    const base = init?.headers;
    const merged = new Headers(base ?? undefined);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        if (!merged.has(key)) merged.set(key, value);
    }
    return { ...init, headers: merged };
}

export function jsonOk<T>(data: T, status = 200) {
    return NextResponse.json(data, withCors({ status }));
}

export function jsonError(message: string, status = 400) {
    return NextResponse.json({ success: false, message }, withCors({ status }));
}

/** Use for raw NextResponse (e.g. HEAD health checks). */
export function withCorsHeaders(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        if (!response.headers.has(key)) response.headers.set(key, value);
    }
    return response;
}
