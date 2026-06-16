import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile() {
    const envPath = path.join(root, ".env");
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i < 0) continue;
        const key = t.slice(0, i).trim();
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
    }
}

loadEnvFile();
const dataDir = path.join(root, "build-data");
const dbPath = path.join(dataDir, "pos.db");
mkdirSync(dataDir, { recursive: true });
if (existsSync(dbPath)) {
    rmSync(dbPath, { force: true });
}
const dbUrl = `file:${dbPath.replace(/\\/g, "/")}`;
const env = { ...process.env, DATABASE_URL: dbUrl };
console.log("[prepare-app-data] Creating empty database at", dbPath);
execSync("npx prisma db push", { cwd: root, env, stdio: "inherit" });
const postgresUri = process.env.POSTGRES_URI?.trim();
if (postgresUri) {
    const cloudPath = path.join(dataDir, "cloud.env");
    const shopId = process.env.SHOP_ID?.trim() || "bata-store-01";
    writeFileSync(cloudPath, [
        `POSTGRES_URI="${postgresUri}"`,
        `SHOP_ID="${shopId}"`,
        `SYNC_ENABLED="true"`,
    ].join("\n"), "utf8");
    console.log("[prepare-app-data] Bundled cloud.env for Supabase sync");
}
else {
    writeFileSync(path.join(dataDir, "cloud.env"), "# Set POSTGRES_URI in %APPDATA%\\pos-desktop\\data\\.env for cloud sync\n", "utf8");
    console.log("[prepare-app-data] No POSTGRES_URI in build .env — installer uses local defaults only");
}
console.log("[prepare-app-data] Done.");
