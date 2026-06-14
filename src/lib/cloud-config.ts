import fs from "fs";
import path from "path";

export interface CloudConfig {
    mongodbUri: string | null;
    shopId: string;
    syncEnabled: boolean;
}

function getDataDir(): string {
    if (process.env.POS_DATA_DIR?.trim()) {
        return process.env.POS_DATA_DIR.trim();
    }
    return path.join(process.cwd(), "data");
}

function getConfigPath(): string {
    return path.join(getDataDir(), "cloud-config.json");
}

function getDevEnvPath(): string {
    return path.join(process.cwd(), ".env");
}

function parseEnvLines(text: string): Record<string, string> {
    const parsed: Record<string, string> = {};
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        parsed[key] = val;
    }
    return parsed;
}

function fromEnv(): CloudConfig {
    const devEnv = fs.existsSync(getDevEnvPath())
        ? parseEnvLines(fs.readFileSync(getDevEnvPath(), "utf8"))
        : {};
    const uri = (process.env.MONGODB_URI ?? devEnv.MONGODB_URI)?.trim() || null;
    const shopId = (process.env.SHOP_ID ?? devEnv.SHOP_ID)?.trim() || "bata-default";
    const syncRaw = process.env.SYNC_ENABLED ?? devEnv.SYNC_ENABLED;
    const syncEnabled = syncRaw !== "false" && Boolean(uri);
    return { mongodbUri: uri, shopId, syncEnabled: syncEnabled && Boolean(uri) };
}

function normalizeStored(raw: Partial<CloudConfig>): CloudConfig {
    const envFallback = fromEnv();
    const mongoUri = raw.mongodbUri !== undefined
        ? (raw.mongodbUri?.trim() || null)
        : envFallback.mongodbUri;
    const syncEnabled = raw.syncEnabled !== undefined
        ? Boolean(raw.syncEnabled && mongoUri)
        : envFallback.syncEnabled;
    return {
        mongodbUri: mongoUri,
        shopId: raw.shopId?.trim() || envFallback.shopId,
        syncEnabled,
    };
}

export function readCloudConfig(): CloudConfig {
    const file = getConfigPath();
    if (!fs.existsSync(file)) {
        return fromEnv();
    }
    try {
        const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<CloudConfig> & {
            provider?: string;
            postgresUri?: string | null;
        };
        if (raw.mongodbUri) {
            return normalizeStored({ mongodbUri: raw.mongodbUri, shopId: raw.shopId, syncEnabled: raw.syncEnabled });
        }
        return normalizeStored(raw);
    }
    catch {
        return fromEnv();
    }
}

export function isCloudConfigured(): boolean {
    const { mongodbUri, syncEnabled } = readCloudConfig();
    return Boolean(mongodbUri && syncEnabled);
}

function upsertDevEnv(updates: Record<string, string | null>): void {
    const envPath = getDevEnvPath();
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    const keys = new Set(Object.keys(updates));
    const out: string[] = [];
    const written = new Set<string>();
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            out.push(line);
            continue;
        }
        const eq = trimmed.indexOf("=");
        if (eq < 1) {
            out.push(line);
            continue;
        }
        const key = trimmed.slice(0, eq).trim();
        if (!keys.has(key)) {
            out.push(line);
            continue;
        }
        const val = updates[key];
        if (val === null) {
            written.add(key);
            continue;
        }
        out.push(`${key}="${val}"`);
        written.add(key);
    }
    for (const [key, val] of Object.entries(updates)) {
        if (val !== null && !written.has(key)) {
            out.push(`${key}="${val}"`);
        }
    }
    fs.writeFileSync(envPath, out.join("\n"), "utf8");
}

export function saveCloudConfig(config: {
    mongodbUri: string;
    shopId?: string;
    syncEnabled?: boolean;
}): CloudConfig {
    const uri = config.mongodbUri.trim();
    if (!uri) {
        throw new Error("MongoDB connection string is required");
    }
    if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
        throw new Error("MongoDB URI must start with mongodb:// or mongodb+srv://");
    }
    const next: CloudConfig = {
        mongodbUri: uri,
        shopId: config.shopId?.trim() || readCloudConfig().shopId || "bata-default",
        syncEnabled: config.syncEnabled !== false,
    };
    fs.mkdirSync(getDataDir(), { recursive: true });
    fs.writeFileSync(getConfigPath(), JSON.stringify(next, null, 2), "utf8");
    process.env.MONGODB_URI = uri;
    process.env.SHOP_ID = next.shopId;
    process.env.SYNC_ENABLED = next.syncEnabled ? "true" : "false";
    upsertDevEnv({
        MONGODB_URI: next.mongodbUri,
        SHOP_ID: next.shopId,
        SYNC_ENABLED: next.syncEnabled ? "true" : "false",
    });
    return next;
}

export function removeCloudConfig(): CloudConfig {
    const current = readCloudConfig();
    const next: CloudConfig = {
        mongodbUri: null,
        shopId: current.shopId,
        syncEnabled: false,
    };
    fs.mkdirSync(getDataDir(), { recursive: true });
    fs.writeFileSync(getConfigPath(), JSON.stringify(next, null, 2), "utf8");
    delete process.env.MONGODB_URI;
    process.env.SYNC_ENABLED = "false";
    upsertDevEnv({
        MONGODB_URI: null,
        SYNC_ENABLED: "false",
    });
    return next;
}

export function maskMongoUri(uri: string | null): string | null {
    if (!uri) return null;
    return uri.replace(/:([^:@/]+)@/, ":****@");
}
