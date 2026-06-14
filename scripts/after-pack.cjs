const fs = require("fs");
const path = require("path");
exports.default = async function afterPack(context) {
    const projectDir = context.packager.projectDir;
    const appOutDir = context.appOutDir;
    const modulesSrc = path.join(projectDir, "packaging", "standalone", "node_modules");
    const modulesDest = path.join(appOutDir, "resources", "standalone", "node_modules");
    if (!fs.existsSync(modulesSrc)) {
        throw new Error(`[after-pack] Missing ${modulesSrc}. Run "npm run stage:package" before electron-builder.`);
    }
    console.log("[after-pack] Copying standalone node_modules…");
    fs.rmSync(modulesDest, { recursive: true, force: true });
    fs.cpSync(modulesSrc, modulesDest, { recursive: true });
    console.log("[after-pack] standalone node_modules ready.");
};

