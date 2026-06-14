import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "icon.png");
const buildDir = path.join(root, "build");
if (!fs.existsSync(src)) {
    console.error("[prepare-icons] Missing public/icon.png");
    process.exit(1);
}
fs.mkdirSync(buildDir, { recursive: true });
const pngOut = path.join(buildDir, "icon.png");
const icoOut = path.join(buildDir, "icon.ico");
fs.copyFileSync(src, pngOut);
const resourcesIcon = path.join(buildDir, "icon.png");
if (resourcesIcon !== pngOut) {
    fs.copyFileSync(src, resourcesIcon);
}
try {
    const pngToIco = (await import("png-to-ico")).default;
    const ico = await pngToIco([pngOut]);
    fs.writeFileSync(icoOut, ico);
    console.log("[prepare-icons] build/icon.png and build/icon.ico ready");
}
catch {
    console.log("[prepare-icons] build/icon.png ready (electron-builder will convert for Windows)");
}

