import { mkdirSync, existsSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
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
const mongoUri = process.env.MONGODB_URI?.trim();
if (mongoUri) {
    const cloudPath = path.join(dataDir, "cloud.env");
    const shopId = process.env.SHOP_ID?.trim() || "store-01";
    writeFileSync(cloudPath, [
        `MONGODB_URI="${mongoUri}"`,
        `SHOP_ID="${shopId}"`,
        `SYNC_ENABLED="true"`,
    ].join("\n"), "utf8");
    console.log("[prepare-app-data] Bundled cloud.env for first-run MongoDB pull");
}
else {
    writeFileSync(path.join(dataDir, "cloud.env"), "# Set MONGODB_URI in %APPDATA%\\pos-desktop\\data\\.env to enable cloud restore\n", "utf8");
    console.log("[prepare-app-data] No MONGODB_URI in build .env — installer uses local defaults only");
}
console.log("[prepare-app-data] Done. First app launch pulls users from MongoDB, then falls back to admin/cashier if offline.");

