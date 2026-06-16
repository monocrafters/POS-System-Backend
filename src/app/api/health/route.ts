import { NextResponse } from "next/server";
import { ensureDatabaseReady } from "@/lib/bootstrap-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    await ensureDatabaseReady();
    return NextResponse.json({
        ok: true,
        service: "pos-backend",
        runtime: "nodejs",
        vercel: Boolean(process.env.VERCEL),
    });
}

export async function HEAD() {
    await ensureDatabaseReady();
    return new NextResponse(null, { status: 200 });
}
