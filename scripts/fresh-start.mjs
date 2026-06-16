/**
 * Fresh start: wipe local SQLite + Supabase cloud backups for this shop.
 * Run: node scripts/fresh-start.mjs --yes
 */
import { spawnSync } from "child_process";
import { resolve } from "path";

const root = process.cwd();
const yes = process.argv.includes("--yes") || process.argv.includes("-y");

if (!yes) {
    console.log([
        "FRESH START — deletes ALL local POS data and Supabase cloud backups.",
        "",
        "After this:",
        "  1. Open desktop app — default admin login is created",
        "  2. Mobile: Settings → Sync now",
        "",
        "Run:",
        "  node scripts/fresh-start.mjs --yes",
    ].join("\n"));
    process.exit(1);
}

console.log("Step 1/2 — cleaning local SQLite...");
const local = spawnSync(process.execPath, [resolve(root, "scripts/clean-local-db.mjs"), "--yes"], {
    stdio: "inherit",
    cwd: root,
});

console.log("\nStep 2/2 — cleaning Supabase cloud backups...");
const cloud = spawnSync(process.execPath, [resolve(root, "scripts/clean-cloud-db.mjs"), "--yes"], {
    stdio: "inherit",
    cwd: root,
});

if (local.status !== 0 && local.status != null) {
    console.warn("Local clean had issues (close desktop app first).");
}
if (cloud.status !== 0) {
    console.error("Cloud clean failed — check POSTGRES_URI in .env and Supabase project.");
    process.exit(cloud.status ?? 1);
}

console.log("\nDone. Restart desktop app and add new data from scratch.");
