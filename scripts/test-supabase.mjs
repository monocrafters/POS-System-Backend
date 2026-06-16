import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
    const envPath = resolve(process.cwd(), ".env");
    try {
        const text = readFileSync(envPath, "utf8");
        for (const line of text.split("\n")) {
            const t = line.trim();
            if (!t || t.startsWith("#")) continue;
            const i = t.indexOf("=");
            if (i < 0) continue;
            const key = t.slice(0, i).trim();
            let val = t.slice(i + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            process.env[key] = val;
        }
    }
    catch {
        // optional
    }
}

loadEnv();
const uri = process.env.POSTGRES_URI?.trim();
if (!uri) {
    console.error("Missing POSTGRES_URI in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: uri,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
});

try {
    await pool.query("SELECT 1");
    console.log("Supabase PostgreSQL: connected OK");
    await pool.end();
}
catch (e) {
    console.error("Supabase connection failed:", e?.message ?? e);
    await pool.end().catch(() => { });
    process.exit(1);
}
