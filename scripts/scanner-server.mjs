import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { ensureScannerCert, getLocalIpv4Addresses } from "./ensure-scanner-cert.mjs";
const PORT = Number(process.env.SCANNER_PORT || 5443);
const HOST = process.env.SCANNER_HOST || "0.0.0.0";
const POS_URL = process.env.POS_URL || "http://127.0.0.1:3000";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "scanner-public");
const { key, cert, ips } = ensureScannerCert();
const clients = new Set();
function readFileSafe(filePath) {
    try {
        return fs.readFileSync(filePath);
    }
    catch {
        return null;
    }
}
function cors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function sendJson(res, status, obj) {
    cors(res);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(obj));
}
function broadcastScan(barcode) {
    const payload = JSON.stringify({ type: "scan", barcode });
    for (const ws of clients) {
        if (ws.readyState === 1)
            ws.send(payload);
    }
}
async function notifyPos(barcode) {
    try {
        const res = await fetch(`${POS_URL}/api/products/barcode-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode }),
        });
        const text = await res.text();
        if (!res.ok) {
            console.warn("[scanner] POS notify HTTP", res.status, text.slice(0, 120));
        }
    }
    catch (err) {
        console.warn("[scanner] POS notify failed:", err.message);
    }
}
async function handleScan(barcode) {
    const code = String(barcode || "").trim();
    if (!code)
        return;
    console.log("[scanner] barcode:", code);
    broadcastScan(code);
    await notifyPos(code);
}
const requestHandler = async (req, res) => {
    const url = new URL(req.url || "/", `https://${HOST}:${PORT}`);
    if (req.method === "OPTIONS") {
        cors(res);
        res.writeHead(204);
        res.end();
        return;
    }
    if (req.method === "GET" && url.pathname === "/api/info") {
        const lanIps = getLocalIpv4Addresses().filter((ip) => ip !== "127.0.0.1");
        sendJson(res, 200, {
            port: PORT,
            protocol: "https",
            urls: [
                `https://127.0.0.1:${PORT}`,
                ...lanIps.map((ip) => `https://${ip}:${PORT}`),
            ],
            ips: lanIps,
        });
        return;
    }
    if (req.method === "POST" && url.pathname === "/api/scan") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            try {
                const json = JSON.parse(body || "{}");
                await handleScan(json.barcode);
                sendJson(res, 200, { ok: true });
            }
            catch {
                sendJson(res, 400, { ok: false });
            }
        });
        return;
    }
    let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }
    const data = readFileSafe(filePath);
    if (!data) {
        res.writeHead(404);
        res.end("Not found");
        return;
    }
    const ext = path.extname(filePath);
    const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript",
        ".css": "text/css",
    };
    cors(res);
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
};
const server = https.createServer({ key, cert }, requestHandler);
const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
});
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`\n[scanner] Port ${PORT} is already in use.`);
        console.error(`[scanner] Run: npm run dev:scanner:free   then: npm run dev\n`);
        process.exit(1);
    }
    console.error("[scanner] Server error:", err);
    process.exit(1);
});
server.listen(PORT, HOST, () => {
    const lanIps = ips.filter((ip) => ip !== "127.0.0.1");
    console.log("\n[scanner] HTTPS camera server (mobile: same Wi‑Fi, trust certificate once)");
    console.log(`[scanner] Local:  https://127.0.0.1:${PORT}`);
    for (const ip of lanIps) {
        console.log(`[scanner] Phone:  https://${ip}:${PORT}`);
    }
    console.log(`[scanner] POS relay: ${POS_URL}/api/products/barcode-event\n`);
});

