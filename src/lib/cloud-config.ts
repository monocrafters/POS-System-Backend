export interface CloudConfig {
    postgresUri: string | null;
    shopId: string;
    syncEnabled: boolean;
}

export function readCloudConfig(): CloudConfig {
    const postgresUri = process.env.POSTGRES_URI?.trim() || null;
    const shopId = process.env.SHOP_ID?.trim() || "bata-store-01";
    const syncEnabled = process.env.SYNC_ENABLED !== "false" && Boolean(postgresUri);
    return { postgresUri, shopId, syncEnabled };
}

export function isCloudConfigured(): boolean {
    const { postgresUri, syncEnabled } = readCloudConfig();
    return Boolean(postgresUri && syncEnabled);
}

export function maskPostgresUri(uri: string | null): string | null {
    if (!uri) return null;
    try {
        const normalized = uri.replace(/^postgresql:\/\//, "https://");
        const parsed = new URL(normalized);
        const host = parsed.hostname;
        const port = parsed.port || "5432";
        const db = parsed.pathname || "/postgres";
        return `postgresql://****@${host}:${port}${db}`;
    }
    catch {
        return "postgresql://****";
    }
}
