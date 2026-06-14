import dns from "dns/promises";
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
function loadEnv() {
    const envPath = resolve(process.cwd(), ".env");
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#"))
            continue;
        const i = t.indexOf("=");
        if (i < 0)
            continue;
        const key = t.slice(0, i).trim();
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        process.env[key] = val;
    }
}
loadEnv();
const base = process.env.MONGODB_URI?.trim();
if (!base) {
    console.error("Missing MONGODB_URI in .env");
    process.exit(1);
}
const candidates = [base];
console.log("Testing SRV lookup...");
try {
    const srv = await dns.resolveSrv("_mongodb._tcp.cluster0.weqdqgo.mongodb.net");
    console.log("SRV OK:", srv.map((s) => s.name).join(", "));
}
catch (e) {
    console.log("SRV FAIL:", e.message);
}
for (const uri of candidates) {
    process.stdout.write(`\nTry: ${uri.slice(0, 90)}... `);
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 12000,
            family: 4,
        });
        await mongoose.connection.db.admin().ping();
        console.log("OK — db:", mongoose.connection.db.databaseName);
        await mongoose.disconnect();
        process.exit(0);
    }
    catch (e) {
        console.log("FAIL —", e.message?.slice(0, 120));
        await mongoose.disconnect().catch(() => { });
    }
}
process.exit(1);

