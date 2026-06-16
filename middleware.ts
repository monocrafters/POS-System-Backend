import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCorsHeaders } from "@/lib/cors-headers";

export function middleware(request: NextRequest) {
    if (!request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    const cors = buildCorsHeaders(request);

    if (request.method === "OPTIONS") {
        return new NextResponse(null, { status: 204, headers: cors });
    }

    const response = NextResponse.next();
    for (const [key, value] of Object.entries(cors)) {
        response.headers.set(key, value);
    }
    return response;
}

export const config = {
    matcher: "/api/:path*",
};
