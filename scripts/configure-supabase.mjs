/**
 * Set Supabase cloud database URI for desktop dev + installed app + future builds.
 *
 * Usage:
 *   node scripts/configure-supabase.mjs "postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres"
 *
 * Direct db.*.supabase.co hosts are IPv6-only. On IPv4 networks we auto-switch to the
 * Session pooler (aws-0/1/2-REGION.pooler.supabase.com).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const inputUri = process.argv[2]?.trim();
if (!inputUri || !inputUri.startsWith("postgresql://")) {
    console.log([
        "Usage:",
        '  node scripts/configure-supabase.mjs "postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres"',
        "",
        "Get URI from: Supabase → Project Settings → Database → Connection string → URI",
        "Or paste the Session pooler URI (recommended on Windows / IPv4 networks).",
    ].join("\n"));
    process.exit(1);
}

const shopId = process.env.SHOP_ID?.trim() || "bata-store-01";

const POOLER_REGIONS = [
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2", "eu-north-1",
    "sa-east-1", "ca-central-1",
];
const POOLER_PREFIXES = ["aws-0-", "aws-1-", "aws-2-"];

function updateEnvFile(filePath, updates) {
    let lines = [];
    if (existsSync(filePath)) {
        lines = readFileSync(filePath, "utf8").split("\n");
    }
    const keys = new Set(Object.keys(updates));
    const kept = lines.filter((line) => {
        const t = line.trim();
        if (!t || t.startsWith("#")) return true;
        const i = t.indexOf("=");
        if (i < 0) return true;
        return !keys.has(t.slice(0, i).trim());
    });
    for (const [key, val] of Object.entries(updates)) {
        kept.push(`${key}="${val}"`);
    }
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, kept.filter(Boolean).join("\n") + "\n", "utf8");
    console.log("Updated:", filePath);
}

function parseDirectSupabaseUri(uri) {
    const match = uri.match(
        /^postgresql:\/\/postgres:([^@]+)@db\.([a-z0-9]+)\.supabase\.co:5432\/postgres$/i,
    );
    if (!match) return null;
    return { password: match[1], projectRef: match[2] };
}

async function testUri(uri) {
    const pool = new Pool({
        connectionString: uri,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
    });
    try {
        await pool.query("SELECT 1");
        return true;
    }
    catch (e) {
        return e;
    }
    finally {
        await pool.end().catch(() => { });
    }
}

function needsPoolerFallback(error) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
        msg.includes("ENOTFOUND") ||
        msg.includes("getaddrinfo") ||
        msg.includes("ENETUNREACH") ||
        msg.includes("EHOSTUNREACH")
    );
}

async function findPoolerUri(projectRef, password) {
    for (const prefix of POOLER_PREFIXES) {
        for (const region of POOLER_REGIONS) {
            for (const port of [5432, 6543]) {
                const candidate = `postgresql://postgres.${projectRef}:${password}@${prefix}${region}.pooler.supabase.com:${port}/postgres`;
                const result = await testUri(candidate);
                if (result === true) return candidate;
            }
        }
    }
    return null;
}

console.log("Testing Supabase connection...");
let uri = inputUri;
let result = await testUri(uri);

if (result !== true && needsPoolerFallback(result)) {
    const direct = parseDirectSupabaseUri(inputUri);
    if (direct) {
        console.log("Direct host is IPv6-only on this network — searching IPv4 pooler...");
        const poolerUri = await findPoolerUri(direct.projectRef, direct.password);
        if (poolerUri) {
            uri = poolerUri;
            console.log("Using pooler URI:", uri.replace(/:([^:@/]+)@/, ":****@"));
            result = true;
        }
    }
}

if (result !== true) {
    console.error("Connection FAILED:", result instanceof Error ? result.message : result);
    console.error([
        "Fix password/host in URI, then try again.",
        "On Windows, copy the Session pooler URI from Supabase → Connect → Session mode.",
    ].join("\n"));
    process.exit(1);
}

console.log("Connection OK");

const cloudEnvContent = [
    `POSTGRES_URI="${uri}"`,
    `SHOP_ID="${shopId}"`,
    `SYNC_ENABLED="true"`,
    "",
].join("\n");

updateEnvFile(path.join(root, ".env"), {
    DATABASE_URL: "file:./prisma/pos.db",
    JWT_SECRET: "pos-desktop-super-secret-change-in-production-2026",
    POSTGRES_URI: uri,
    SHOP_ID: shopId,
    SYNC_ENABLED: "true",
});

const appDataEnv = path.join(os.homedir(), "AppData", "Roaming", "pos-desktop", "data", ".env");
if (existsSync(appDataEnv)) {
    updateEnvFile(appDataEnv, {
        POSTGRES_URI: uri,
        SHOP_ID: shopId,
        SYNC_ENABLED: "true",
    });
}
else {
    console.log("No installed app .env yet (OK if you only use npm run dev).");
}

for (const rel of ["build-data/cloud.env", "packaging/data/cloud.env"]) {
    const p = path.join(root, rel);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, cloudEnvContent, "utf8");
    console.log("Updated:", p);
}

console.log("\nDone. Restart desktop app (or npm run dev) and check Settings → Cloud sync.");
