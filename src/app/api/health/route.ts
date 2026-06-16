import { NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";
import { withCorsHeaders } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    await ensureDatabaseReady();
    return withCorsHeaders(NextResponse.json({
        ok: true,
        service: "pos-backend",
        runtime: "nodejs",
        vercel: Boolean(process.env.VERCEL),
    }));
}

export async function HEAD() {
    await ensureDatabaseReady();
    return withCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function OPTIONS() {
    return withCorsHeaders(new NextResponse(null, { status: 204 }));
}
