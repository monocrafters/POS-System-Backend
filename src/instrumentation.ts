export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }
    try {
        const { ensureDatabaseReady } = await import("@/lib/bootstrap-db");
        await ensureDatabaseReady();
    }
    catch (error) {
        console.error("[instrumentation] database bootstrap failed:", error);
    }
}

