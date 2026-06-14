import { cpSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");
function copyDir(src, dest) {
    if (!existsSync(src)) {
        console.warn(`[copy-standalone] Skip missing: ${src}`);
        return;
    }
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log(`[copy-standalone] ${src} → ${dest}`);
}
if (!existsSync(standalone)) {
    console.error("[copy-standalone] Run next build with ELECTRON=true first.");
    process.exit(1);
}
copyDir(staticSrc, staticDest);
copyDir(publicSrc, publicDest);
console.log("[copy-standalone] Done.");

