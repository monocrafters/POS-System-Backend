import { app, BrowserWindow, shell, ipcMain, net, dialog, type BrowserWindowConstructorOptions, } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { spawn, type ChildProcess } from "child_process";
import http from "http";
const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
const PROD_PORT = 3456;
const DEV_URL = "http://localhost:3000";
function getAppIconPath(): string | undefined {
    const candidates = app.isPackaged
        ? [
            path.join(process.resourcesPath, "icon.png"),
            path.join(process.resourcesPath, "standalone", "public", "icon.png"),
        ]
        : [
            path.join(__dirname, "..", "public", "icon.png"),
            path.join(__dirname, "..", "build", "icon.png"),
        ];
    return candidates.find((p) => fs.existsSync(p));
}
function logFilePath(): string {
    return path.join(app.getPath("userData"), "pos-desktop.log");
}
function logLine(message: string, err?: unknown): void {
    const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : err ? String(err) : "";
    const line = `[${new Date().toISOString()}] ${message}${detail ? `\n${detail}` : ""}\n`;
    try {
        fs.appendFileSync(logFilePath(), line);
    }
    catch {
    }
    console.error(line);
}
function showFatalError(title: string, message: string): void {
    logLine(title, message);
    dialog.showErrorBox(title, `${message}\n\nDetails saved to:\n${logFilePath()}`);
}
let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;
let wasOnline = true;
let networkCheckInterval: ReturnType<typeof setInterval> | null = null;
function getPreloadPath(): string {
    return path.join(__dirname, "preload.js");
}
function getWindowOptions(): BrowserWindowConstructorOptions {
    const icon = getAppIconPath();
    return {
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        resizable: true,
        show: true,
        center: true,
        title: "POS Desktop",
        backgroundColor: "#fafafa",
        autoHideMenuBar: true,
        ...(icon ? { icon } : {}),
        webPreferences: {
            preload: getPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
    };
}
function waitForServer(url: string, maxAttempts = 60): Promise<void> {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            const req = http.get(url, (res) => {
                res.resume();
                if (res.statusCode && res.statusCode < 500) {
                    resolve();
                }
                else if (attempts < maxAttempts) {
                    setTimeout(check, 500);
                }
                else {
                    reject(new Error(`Server not ready: ${url}`));
                }
            });
            req.on("error", () => {
                if (attempts < maxAttempts) {
                    setTimeout(check, 500);
                }
                else {
                    reject(new Error(`Server not reachable: ${url}`));
                }
            });
            req.setTimeout(2000, () => {
                req.destroy();
                if (attempts < maxAttempts) {
                    setTimeout(check, 500);
                }
                else {
                    reject(new Error(`Server timeout: ${url}`));
                }
            });
        };
        check();
    });
}
function getStandalonePath(): string {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "standalone");
    }
    return path.join(__dirname, "..", ".next", "standalone");
}
function parseEnvFile(filePath: string): Record<string, string> {
    const parsed: Record<string, string> = {};
    if (!fs.existsSync(filePath))
        return parsed;
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const eq = trimmed.indexOf("=");
        if (eq < 1)
            continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        parsed[key] = val;
    }
    return parsed;
}
function loadBundledCloudEnv(): Record<string, string> {
    if (!app.isPackaged)
        return {};
    return parseEnvFile(path.join(process.resourcesPath, "data", "cloud.env"));
}
function loadProductionEnv(): Record<string, string> {
    const dataDir = path.join(app.getPath("userData"), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "pos.db");
    const envFile = path.join(dataDir, ".env");
    const bundledDb = path.join(process.resourcesPath, "data", "pos.db");
    const cloudEnv = loadBundledCloudEnv();
    if (!fs.existsSync(dbPath) && fs.existsSync(bundledDb)) {
        fs.copyFileSync(bundledDb, dbPath);
    }
    if (!fs.existsSync(envFile)) {
        const jwt = crypto.randomBytes(32).toString("hex");
        const dbUrl = `file:${dbPath.replace(/\\/g, "/")}`;
        const mongoUri = cloudEnv.MONGODB_URI?.trim();
        const lines = [
            `DATABASE_URL="${dbUrl}"`,
            `JWT_SECRET="${jwt}"`,
            `SHOP_ID="${cloudEnv.SHOP_ID?.trim() || "store-01"}"`,
            `SYNC_ENABLED="${mongoUri ? "true" : "false"}"`,
        ];
        if (mongoUri) {
            lines.push(`MONGODB_URI="${mongoUri}"`);
        }
        fs.writeFileSync(envFile, lines.join("\n"), "utf8");
    }
    const parsed = parseEnvFile(envFile);
    if (!parsed.DATABASE_URL) {
        parsed.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;
    }
    if (!parsed.JWT_SECRET) {
        parsed.JWT_SECRET = crypto.randomBytes(32).toString("hex");
    }
    if (!parsed.SHOP_ID && cloudEnv.SHOP_ID) {
        parsed.SHOP_ID = cloudEnv.SHOP_ID;
    }
    if (!parsed.MONGODB_URI && cloudEnv.MONGODB_URI) {
        parsed.MONGODB_URI = cloudEnv.MONGODB_URI;
        parsed.SYNC_ENABLED = "true";
    }
    return parsed;
}
function startProductionServer(): Promise<string> {
    return new Promise((resolve, reject) => {
        const standalonePath = getStandalonePath();
        const serverPath = path.join(standalonePath, "server.js");
        const modulesPath = path.join(standalonePath, "node_modules");
        if (!fs.existsSync(serverPath)) {
            reject(new Error(`Server file not found: ${serverPath}`));
            return;
        }
        if (!fs.existsSync(modulesPath)) {
            reject(new Error(`Server dependencies missing at ${modulesPath}. Reinstall the application.`));
            return;
        }
        const dataDir = path.join(app.getPath("userData"), "data");
        const appEnv = app.isPackaged ? loadProductionEnv() : {};
        if (app.isPackaged) {
            const bundledEnv = path.join(standalonePath, ".env");
            if (fs.existsSync(bundledEnv)) {
                fs.unlinkSync(bundledEnv);
                logLine("Removed bundled standalone/.env (uses AppData database config)");
            }
        }
        logLine(`Starting Next server at ${serverPath}`);
        logLine(`DATABASE_URL=${appEnv.DATABASE_URL ?? "(dev)"}`);
        nextServer = spawn(process.execPath, [serverPath], {
            cwd: standalonePath,
            env: {
                ELECTRON_RUN_AS_NODE: "1",
                NODE_ENV: "production",
                PORT: String(PROD_PORT),
                HOSTNAME: "127.0.0.1",
                POS_DATA_DIR: dataDir,
                ...(app.isPackaged ? appEnv : process.env),
            },
            stdio: "pipe",
            windowsHide: true,
        });
        nextServer.on("error", reject);
        nextServer.stderr?.on("data", (data: Buffer) => {
            logLine("[Next Server stderr]", data.toString());
        });
        nextServer.stdout?.on("data", (data: Buffer) => {
            logLine("[Next Server]", data.toString().trim());
        });
        nextServer.on("exit", (code, signal) => {
            if (code !== 0 && code !== null) {
                logLine(`Next server exited (code=${code}, signal=${signal ?? "none"})`);
            }
        });
        const url = `http://127.0.0.1:${PROD_PORT}`;
        waitForServer(url, 120)
            .then(() => {
            logLine(`Next server ready at ${url}`);
            resolve(url);
        })
            .catch(reject);
    });
}
const LOADING_HTML = `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>POS Desktop</title>
<style>
  body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
  font-family:system-ui,sans-serif;background:#fafafa;color:#171717}
  .box{text-align:center}
  .spin{width:40px;height:40px;border:3px solid #e5e5e5;border-top-color:#E31837;
  border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
  @keyframes spin{to{transform:rotate(360deg)}}
</style></head><body><div class="box"><div class="spin"></div><p>Starting POS Desktop…</p></div></body></html>`)}`;
async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow(getWindowOptions());
    await mainWindow.loadURL(LOADING_HTML);
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            shell.openExternal(url);
        }
        return { action: "deny" };
    });
    mainWindow.webContents.on("will-navigate", (event, url) => {
        const allowed = url.startsWith(DEV_URL) ||
            url.startsWith(`http://127.0.0.1:${PROD_PORT}`) ||
            url.startsWith(`http://localhost:${PROD_PORT}`);
        if (!allowed) {
            event.preventDefault();
        }
    });
    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    try {
        if (isDev) {
            await mainWindow.loadURL(DEV_URL);
            mainWindow.webContents.openDevTools({ mode: "detach" });
        }
        else {
            const prodUrl = await startProductionServer();
            await mainWindow.loadURL(prodUrl);
            if (process.env.ELECTRON_OPEN_DEVTOOLS === "true") {
                mainWindow.webContents.openDevTools({ mode: "detach" });
            }
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showFatalError("POS Desktop could not start", `The application server failed to start.\n\n${msg}`);
        app.quit();
    }
}
function broadcastNetworkStatus(online: boolean): void {
    if (!mainWindow || mainWindow.isDestroyed())
        return;
    mainWindow.webContents.send(online ? "network:online" : "network:offline");
}
function startNetworkWatcher(): void {
    wasOnline = net.isOnline();
    networkCheckInterval = setInterval(() => {
        const online = net.isOnline();
        if (online !== wasOnline) {
            wasOnline = online;
            broadcastNetworkStatus(online);
        }
    }, 3000);
}
function stopNetworkWatcher(): void {
    if (networkCheckInterval) {
        clearInterval(networkCheckInterval);
        networkCheckInterval = null;
    }
}
function guessReceiptWidthMm(printerName: string): 58 | 80 {
    const n = printerName.toLowerCase();
    const is58 = ["58mm", "58 mm", "58-mm", "rp58", "xp-58", "pos58", "2 inch", "2inch", "2\""].some((h) => n.includes(h));
    if (is58 || (n.includes("58") && !n.includes("80")))
        return 58;
    const is80 = ["80mm", "80 mm", "80-mm", "rp80", "xp-80", "pos80", "3 inch", "3inch", "3\""].some((h) => n.includes(h));
    if (is80 || n.includes("80"))
        return 80;
    return 80;
}
function registerIpcHandlers(): void {
    ipcMain.handle("app:get-version", () => app.getVersion());
    ipcMain.handle("app:get-platform", () => process.platform);
    ipcMain.handle("app:is-packaged", () => app.isPackaged);
    ipcMain.handle("network:status", () => net.isOnline());
    ipcMain.handle("printer:receipt-width", async () => {
        const win = mainWindow ?? BrowserWindow.getAllWindows()[0];
        if (!win)
            return { widthMm: 80 as const, printerName: null };
        const printers = await win.webContents.getPrintersAsync();
        if (!printers.length)
            return { widthMm: 80 as const, printerName: null };
        const thermal = printers.find((p) => /thermal|receipt|pos|80|58|xprinter|epson|star|bematech/i.test(p.name));
        const chosen = thermal ?? printers[0];
        return {
            widthMm: guessReceiptWidthMm(chosen.name),
            printerName: chosen.name,
        };
    });
}
function cleanup(): void {
    if (nextServer) {
        nextServer.kill();
        nextServer = null;
    }
}
app.on("certificate-error", (event, _webContents, url, _error, _certificate, callback) => {
    try {
        const { port, hostname } = new URL(url);
        if (port === "5443" &&
            (hostname === "127.0.0.1" || hostname === "localhost")) {
            event.preventDefault();
            callback(true);
            return;
        }
    }
    catch {
    }
    callback(false);
});
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
}
else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
}
app.whenReady().then(async () => {
    try {
        registerIpcHandlers();
        startNetworkWatcher();
        await createWindow();
        if (net.isOnline()) {
            setTimeout(() => broadcastNetworkStatus(true), 2000);
        }
        app.on("activate", async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await createWindow();
            }
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showFatalError("POS Desktop failed to launch", msg);
        app.quit();
    }
});
app.on("window-all-closed", () => {
    cleanup();
    if (process.platform !== "darwin") {
        app.quit();
    }
});
app.on("before-quit", () => {
    stopNetworkWatcher();
    cleanup();
});
app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });
});

