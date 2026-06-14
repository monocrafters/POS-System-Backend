import dns from "dns/promises";
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv() {
    const envPath = resolve(process.cwd(), ".env");
    try {
        const text = readFileSync(envPath, "utf8");
        for (const line of text.split("\n")) {
            const t = line.trim();
            if (!t || t.startsWith("#"))
                continue;
            const i = t.indexOf("=");
            if (i < 0)
                continue;
            const key = t.slice(0, i).trim();
            let val = t.slice(i + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            process.env[key] = val;
        }
    }
    catch {
    }
}
function hasYesFlag() {
    return process.argv.includes("--yes") || process.argv.includes("-y");
}
loadEnv();
const uri = process.env.MONGODB_URI?.trim();
const shopId = (process.env.SHOP_ID?.trim() || "bata-default").trim();
if (!hasYesFlag()) {
    console.log([
        "This will DELETE cloud MongoDB data for this SHOP_ID.",
        "",
        `SHOP_ID: ${shopId}`,
        "",
        "Run with:",
        "  node scripts/clean-cloud-db.mjs --yes",
        "",
        "Required env:",
        "  - MONGODB_URI",
        "  - SHOP_ID (optional; defaults to bata-default)",
        "",
        "What it deletes right now:",
        "  - users collection docs with { shopId: SHOP_ID }",
        "",
    ].join("\n"));
    process.exit(1);
}
if (!uri) {
    console.error("Missing MONGODB_URI (set it in .env or environment variables).");
    process.exit(1);
}
try {
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        family: 4,
    });
    const db = mongoose.connection.db;
    const users = db.collection("users");
    const res = await users.deleteMany({ shopId });
    console.log(`Deleted cloud users: ${res.deletedCount ?? 0} (shopId=${shopId})`);
    console.log("Cloud clean done.");
    await mongoose.disconnect();
}
catch (e) {
    console.error("Cloud clean failed:", e?.message ?? e);
    await mongoose.disconnect().catch(() => { });
    process.exit(1);
}

