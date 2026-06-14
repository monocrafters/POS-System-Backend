export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        try {
            const { ensureDatabaseReady } = await import("@/lib/bootstrap-db");
            await ensureDatabaseReady();
            (globalThis as any).bootstrapError = null;
        } catch (err: any) {
            console.error("[bootstrap error]", err);
            (globalThis as any).bootstrapError = err instanceof Error ? { message: err.message, stack: err.stack } : String(err);
        }
    }
}

