import fs from "fs";
import path from "path";
import os from "os";
function hasYesFlag() {
    return process.argv.includes("--yes") || process.argv.includes("-y");
}
function unlinkIfExists(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted:", filePath);
            return true;
        }
    }
    catch (e) {
        console.log("Failed:", filePath, "-", e?.message ?? e);
    }
    return false;
}
if (!hasYesFlag()) {
    console.log([
        "This will DELETE local SQLite database files.",
        "",
        "Run with:",
        "  node scripts/clean-local-db.mjs --yes",
        "",
        "Targets:",
        "  - Installed app DB: %APPDATA%/pos-desktop/data/pos.db",
        "  - Dev DB: prisma/pos.db (if present)",
        "",
    ].join("\n"));
    process.exit(1);
}
const projectRoot = process.cwd();
const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const targets = [
    path.join(appData, "pos-desktop", "data", "pos.db"),
    path.join(projectRoot, "prisma", "pos.db"),
    path.join(projectRoot, "prisma", "prisma", "pos.db"),
    path.join(projectRoot, "build-data", "pos.db"),
    path.join(projectRoot, "packaging", "data", "pos.db"),
    path.join(projectRoot, "release", "win-unpacked", "resources", "data", "pos.db"),
];
let deleted = 0;
for (const t of targets) {
    if (unlinkIfExists(t))
        deleted++;
}
if (deleted === 0) {
    console.log("No local DB files found to delete.");
}

