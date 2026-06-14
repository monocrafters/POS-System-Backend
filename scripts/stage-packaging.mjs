import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        throw new Error(`Missing path: ${src}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true, force: true });
}
const packaging = path.join(root, "packaging");
fs.rmSync(packaging, { recursive: true, force: true });
fs.mkdirSync(packaging, { recursive: true });
console.log("[stage-packaging] Copying Next standalone…");
copyDir(path.join(root, ".next", "standalone"), path.join(packaging, "standalone"));
const bundledEnv = path.join(packaging, "standalone", ".env");
if (fs.existsSync(bundledEnv)) {
    fs.unlinkSync(bundledEnv);
    console.log("[stage-packaging] Removed standalone/.env from package");
}
const staticSrc = path.join(root, ".next", "static");
if (fs.existsSync(staticSrc)) {
    copyDir(staticSrc, path.join(packaging, "standalone", ".next", "static"));
}
const publicSrc = path.join(root, "public");
if (fs.existsSync(publicSrc)) {
    copyDir(publicSrc, path.join(packaging, "standalone", "public"));
}
const iconSrc = path.join(root, "public", "icon.png");
if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(packaging, "standalone", "public", "icon.png"));
}
const dbSrc = path.join(root, "build-data");
if (fs.existsSync(dbSrc)) {
    copyDir(dbSrc, path.join(packaging, "data"));
}
console.log("[stage-packaging] Done.");

