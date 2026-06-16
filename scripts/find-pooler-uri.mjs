import { Pool } from "pg";

const ref = process.argv[2] || "ueqgprsucrdsrvckpduh";
const pass = process.argv[3] || "Mohsin030777";
const regions = [
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2", "eu-north-1",
    "sa-east-1", "ca-central-1",
];
const prefixes = ["aws-0-", "aws-1-", "aws-2-"];

for (const prefix of prefixes) {
    for (const r of regions) {
        for (const port of [5432, 6543]) {
            const uri = `postgresql://postgres.${ref}:${pass}@${prefix}${r}.pooler.supabase.com:${port}/postgres`;
            const pool = new Pool({
                connectionString: uri,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 6000,
            });
            try {
                await pool.query("SELECT 1");
                console.log("SUCCESS");
                console.log(uri);
                await pool.end();
                process.exit(0);
            } catch (e) {
                const msg = e?.message ?? "";
                if (!msg.includes("Tenant or user not found") && !msg.includes("tenant/user")) {
                    console.log(prefix + r, port, msg.slice(0, 80));
                }
                await pool.end().catch(() => {});
            }
        }
    }
}
console.error("No working pooler URI found");
process.exit(1);
