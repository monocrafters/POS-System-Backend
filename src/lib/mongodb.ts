import mongoose from "mongoose";
import { readCloudConfig } from "./cloud-config";
import { getMongoConnectionUris } from "./mongodb-uri";
const globalForMongo = globalThis as unknown as {
    mongooseConn: typeof mongoose | null;
    mongoosePromise: Promise<typeof mongoose> | null;
    lastConnectedUri?: string;
};
export function isMongoConfigured(): boolean {
    const { mongodbUri, syncEnabled } = readCloudConfig();
    return Boolean(mongodbUri && syncEnabled);
}
export function getConfiguredShopId(): string {
    return readCloudConfig().shopId || "bata-default";
}
export function getConfiguredMongoUri(): string | null {
    return readCloudConfig().mongodbUri;
}
function getConnectOptions(uri: string) {
    return {
        bufferCommands: false,
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        family: 4 as const,
        tls: uri.includes("mongodb+srv") || uri.includes("tls=true") || uri.includes("ssl=true"),
    };
}
async function tryConnectUri(uri: string): Promise<typeof mongoose> {
    await mongoose.disconnect().catch(() => { });
    const conn = await mongoose.connect(uri, getConnectOptions(uri));
    globalForMongo.lastConnectedUri = uri;
    return conn;
}
async function connectAllUris(): Promise<typeof mongoose> {
    const uris = await getMongoConnectionUris();
    let lastError: Error | undefined;
    for (const uri of uris) {
        try {
            const conn = await tryConnectUri(uri);
            globalForMongo.mongooseConn = conn;
            return conn;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            globalForMongo.mongooseConn = null;
        }
    }
    throw lastError ?? new Error("MongoDB connection failed");
}
export async function connectMongo(): Promise<typeof mongoose | null> {
    if (!isMongoConfigured())
        return null;
    if (globalForMongo.mongooseConn) {
        return globalForMongo.mongooseConn;
    }
    if (!globalForMongo.mongoosePromise) {
        globalForMongo.mongoosePromise = connectAllUris().catch((err) => {
            globalForMongo.mongoosePromise = null;
            globalForMongo.mongooseConn = null;
            throw err;
        });
    }
    return globalForMongo.mongoosePromise;
}
export async function disconnectMongo(): Promise<void> {
    globalForMongo.mongoosePromise = null;
    globalForMongo.mongooseConn = null;
    await mongoose.disconnect().catch(() => { });
}
export interface MongoHealthResult {
    configured: boolean;
    connected: boolean;
    message: string;
    database: string | null;
    shopId: string | null;
    latencyMs: number | null;
    connectionMode?: string;
}
export async function checkMongoHealthQuick(): Promise<MongoHealthResult> {
    const shopId = getConfiguredShopId();
    if (!isMongoConfigured()) {
        return {
            configured: false,
            connected: false,
            message: "MongoDB not configured",
            database: null,
            shopId,
            latencyMs: null,
        };
    }
    const start = Date.now();
    try {
        if (globalForMongo.mongooseConn?.connection?.readyState === 1) {
            await globalForMongo.mongooseConn.connection.db?.admin().ping();
            return {
                configured: true,
                connected: true,
                message: "MongoDB connected",
                database: globalForMongo.mongooseConn.connection.db?.databaseName ?? null,
                shopId,
                latencyMs: Date.now() - start,
            };
        }
        const conn = await connectMongo();
        if (!conn) {
            return {
                configured: true,
                connected: false,
                message: "Could not connect to MongoDB",
                database: null,
                shopId,
                latencyMs: Date.now() - start,
            };
        }
        await conn.connection.db?.admin().ping();
        return {
            configured: true,
            connected: true,
            message: "MongoDB connected",
            database: conn.connection.db?.databaseName ?? null,
            shopId,
            latencyMs: Date.now() - start,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "MongoDB connection failed";
        return {
            configured: true,
            connected: false,
            message,
            database: null,
            shopId,
            latencyMs: Date.now() - start,
        };
    }
}

export async function checkMongoHealth(): Promise<MongoHealthResult> {
    const shopId = getConfiguredShopId();
    if (!isMongoConfigured()) {
        return {
            configured: false,
            connected: false,
            message: "MongoDB not configured. Set MONGODB_URI in .env",
            database: null,
            shopId,
            latencyMs: null,
        };
    }
    const start = Date.now();
    try {
        await disconnectMongo();
        const conn = await connectMongo();
        if (!conn) {
            return {
                configured: true,
                connected: false,
                message: "Could not establish MongoDB connection",
                database: null,
                shopId,
                latencyMs: null,
            };
        }
        await conn.connection.db?.admin().ping();
        const dbName = conn.connection.db?.databaseName ??
            conn.connection.name ??
            "bata-pos";
        const mode = globalForMongo.lastConnectedUri?.startsWith("mongodb+srv://")
            ? "mongodb+srv"
            : globalForMongo.lastConnectedUri?.includes("replicaSet=")
                ? "atlas-replica-set"
                : "standard";
        return {
            configured: true,
            connected: true,
            message: "MongoDB Atlas is connected and responding",
            database: dbName,
            shopId,
            latencyMs: Date.now() - start,
            connectionMode: mode,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "MongoDB connection failed";
        let hint = "";
        if (message.includes("querySrv")) {
            hint =
                " DNS issue — use mongodb+srv URI; app now uses Google DNS (8.8.8.8). Restart npm run dev.";
        }
        else if (message.includes("whitelist") || message.includes("IP")) {
            hint =
                " Confirm Atlas Network Access has 0.0.0.0/0 ACTIVE (green). Wait 2 min. Project: https://cloud.mongodb.com/v2/6a0f2e93ac618e56a5af434d#/security/network";
        }
        else if (message.includes("timed out") || message.includes("ETIMEDOUT")) {
            hint =
                " Port 27017 may be blocked — try another network (mobile hotspot) or allow Node.js in Windows Firewall.";
        }
        else if (message.includes("auth") || message.includes("Authentication")) {
            hint =
                " Check Database Access username/password in Atlas matches .env exactly.";
        }
        return {
            configured: true,
            connected: false,
            message: message + hint,
            database: null,
            shopId,
            latencyMs: Date.now() - start,
        };
    }
}

