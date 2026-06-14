import dns from "node:dns/promises";
const DEFAULT_DB = "bata-pos";
import { setServers as setDnsServers } from "node:dns";
setDnsServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
export function srvToDirectMongoUri(srvUri: string): string {
    if (!srvUri.startsWith("mongodb+srv://")) {
        return srvUri;
    }
    const rest = srvUri.slice("mongodb+srv://".length);
    const qIndex = rest.indexOf("?");
    const authHost = qIndex >= 0 ? rest.slice(0, qIndex) : rest;
    const query = qIndex >= 0 ? rest.slice(qIndex + 1) : "";
    const at = authHost.lastIndexOf("@");
    if (at < 0)
        return srvUri;
    const auth = authHost.slice(0, at);
    const host = authHost.slice(at + 1);
    const pathMatch = host.match(/^([^/]+)(\/.*)?$/);
    const hostname = pathMatch?.[1] ?? host;
    const pathDb = pathMatch?.[2]?.replace(/^\//, "") || DEFAULT_DB;
    const params = new URLSearchParams(query);
    if (!params.has("retryWrites"))
        params.set("retryWrites", "true");
    if (!params.has("w"))
        params.set("w", "majority");
    if (!params.has("authSource"))
        params.set("authSource", "admin");
    if (!params.has("tls") && !params.has("ssl"))
        params.set("tls", "true");
    const qs = params.toString();
    return `mongodb://${auth}@${hostname}:27017/${pathDb}${qs ? `?${qs}` : ""}`;
}
export async function buildAtlasReplicaUriFromDns(srvUri: string): Promise<string | null> {
    if (!srvUri.startsWith("mongodb+srv://"))
        return null;
    const rest = srvUri.slice("mongodb+srv://".length);
    const qIndex = rest.indexOf("?");
    const authHost = qIndex >= 0 ? rest.slice(0, qIndex) : rest;
    const query = qIndex >= 0 ? rest.slice(qIndex + 1) : "";
    const at = authHost.lastIndexOf("@");
    if (at < 0)
        return null;
    const auth = authHost.slice(0, at);
    const hostPart = authHost.slice(at + 1);
    const clusterHost = hostPart.split("/")[0];
    const dbName = hostPart.includes("/") ? hostPart.split("/").slice(1).join("/") : DEFAULT_DB;
    try {
        const [srvRecords, txtRecords] = await Promise.all([
            dns.resolveSrv(`_mongodb._tcp.${clusterHost}`),
            dns.resolveTxt(clusterHost),
        ]);
        const txtJoined = txtRecords.map((r) => r.join("")).join("&");
        const replicaSet = txtJoined.match(/replicaSet=([^&]+)/)?.[1];
        if (!replicaSet || srvRecords.length === 0)
            return null;
        const hosts = srvRecords
            .map((r) => `${r.name}:${r.port}`)
            .join(",");
        const params = new URLSearchParams(query);
        params.set("ssl", "true");
        params.set("replicaSet", replicaSet);
        if (!params.has("authSource"))
            params.set("authSource", "admin");
        if (!params.has("retryWrites"))
            params.set("retryWrites", "true");
        if (!params.has("w"))
            params.set("w", "majority");
        return `mongodb://${auth}@${hosts}/${dbName}?${params.toString()}`;
    }
    catch {
        return null;
    }
}
export async function getMongoConnectionUris(): Promise<string[]> {
    const { readCloudConfig } = await import("./cloud-config");
    const raw = readCloudConfig().mongodbUri?.trim();
    if (!raw)
        return [];
    const seen = new Set<string>();
    const add = (u: string) => {
        if (u && !seen.has(u)) {
            seen.add(u);
            return u;
        }
        return null;
    };
    const uris: string[] = [];
    const a = add(raw);
    if (a)
        uris.push(a);
    if (raw.startsWith("mongodb+srv://")) {
        const replica = await buildAtlasReplicaUriFromDns(raw);
        const r = replica ? add(replica) : null;
        if (r)
            uris.push(r);
        const direct = add(srvToDirectMongoUri(raw));
        if (direct)
            uris.push(direct);
    }
    return uris;
}

