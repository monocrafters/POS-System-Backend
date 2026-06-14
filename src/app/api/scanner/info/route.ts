import { jsonOk } from "@/lib/api-response";
import os from "os";
const PORT = Number(process.env.SCANNER_PORT || 5443);
function getLanIps(): string[] {
    const nets = os.networkInterfaces();
    const ips: string[] = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] ?? []) {
            if (net.family === "IPv4" && !net.internal) {
                ips.push(net.address);
            }
        }
    }
    return ips;
}
export async function GET() {
    const lanIps = getLanIps();
    return jsonOk({
        success: true,
        running: true,
        port: PORT,
        localUrl: `https://127.0.0.1:${PORT}`,
        phoneUrls: lanIps.map((ip) => `https://${ip}:${PORT}`),
        hint: "Open the phone URL on your mobile (same Wi‑Fi), allow camera, and scan barcodes.",
    });
}
