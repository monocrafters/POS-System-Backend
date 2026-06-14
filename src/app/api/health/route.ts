import { NextResponse } from "next/server";

export async function GET() {
    const bootstrapError = (globalThis as any).bootstrapError;
    if (bootstrapError) {
        return NextResponse.json({ ok: false, error: bootstrapError }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}

export async function HEAD() {
    return new NextResponse(null, { status: (globalThis as any).bootstrapError ? 500 : 200 });
}
