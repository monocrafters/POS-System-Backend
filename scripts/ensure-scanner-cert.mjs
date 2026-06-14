import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(__dirname, "..", "scanner-certs");
const KEY_PATH = path.join(CERT_DIR, "key.pem");
const CERT_PATH = path.join(CERT_DIR, "cert.pem");
export function getLocalIpv4Addresses() {
    const ips = new Set(["127.0.0.1"]);
    for (const ifaces of Object.values(os.networkInterfaces())) {
        if (!ifaces)
            continue;
        for (const cfg of ifaces) {
            if (cfg.family === "IPv4" && !cfg.internal) {
                ips.add(cfg.address);
            }
        }
    }
    return [...ips];
}
function buildAltNames(ips) {
    const altNames = [{ type: 2, value: "localhost" }];
    for (const ip of ips) {
        altNames.push({ type: 7, ip });
    }
    return altNames;
}
function certNeedsRegenerate(ips) {
    if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH))
        return true;
    const metaPath = path.join(CERT_DIR, "meta.json");
    if (!fs.existsSync(metaPath))
        return true;
    try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        const saved = [...(meta.ips ?? [])].sort().join(",");
        const current = [...ips].sort().join(",");
        return saved !== current;
    }
    catch {
        return true;
    }
}
export function ensureScannerCert() {
    const ips = getLocalIpv4Addresses();
    if (!certNeedsRegenerate(ips)) {
        return {
            key: fs.readFileSync(KEY_PATH),
            cert: fs.readFileSync(CERT_PATH),
            ips,
        };
    }
    fs.mkdirSync(CERT_DIR, { recursive: true });
    const altNames = buildAltNames(ips);
    const attrs = [{ name: "commonName", value: "Bata POS Scanner" }];
    const generated = selfsigned.generate(attrs, {
        keySize: 2048,
        days: 825,
        algorithm: "sha256",
        extensions: [{ name: "subjectAltName", altNames }],
    });
    fs.writeFileSync(KEY_PATH, generated.private);
    fs.writeFileSync(CERT_PATH, generated.cert);
    fs.writeFileSync(path.join(CERT_DIR, "meta.json"), JSON.stringify({ ips, generatedAt: new Date().toISOString() }, null, 2));
    return { key: generated.private, cert: generated.cert, ips };
}

