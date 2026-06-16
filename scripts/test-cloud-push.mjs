import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
    }
    process.env[t.slice(0, i).trim()] = v;
}

const { runFullSync } = await import("../src/lib/sync/sync-service.ts");
const result = await runFullSync();
console.log("sync:", result);

const { getCloudPool } = await import("../src/lib/supabase-cloud.ts");
const pool = getCloudPool();
if (!pool) throw new Error("No pool");
const shopId = process.env.SHOP_ID || "bata-store-01";
const products = await pool.query(
    "SELECT id, name, price, stock FROM pos_products WHERE shop_id = $1 LIMIT 5",
    [shopId],
);
console.log("pos_products sample:", products.rows);
await pool.end();
