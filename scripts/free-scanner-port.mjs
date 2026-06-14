import { execSync } from "node:child_process";
import process from "node:process";
const PORT = String(process.env.SCANNER_PORT || 5443);
const myPid = process.pid;
function freeOnWindows() {
    try {
        const out = execSync(`netstat -ano | findstr :${PORT}`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "ignore"],
        });
        const pids = new Set();
        for (const line of out.split(/\r?\n/)) {
            if (!line.includes("LISTENING"))
                continue;
            const parts = line.trim().split(/\s+/);
            const pid = Number(parts[parts.length - 1]);
            if (pid > 0 && pid !== myPid)
                pids.add(pid);
        }
        for (const pid of pids) {
            try {
                execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
                console.log(`[scanner] Freed port ${PORT} (stopped PID ${pid})`);
            }
            catch {
            }
        }
    }
    catch {
    }
}
function freeOnUnix() {
    try {
        const out = execSync(`lsof -ti :${PORT}`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "ignore"],
        });
        for (const line of out.split(/\r?\n/)) {
            const pid = Number(line.trim());
            if (pid > 0 && pid !== myPid) {
                try {
                    process.kill(pid, "SIGTERM");
                    console.log(`[scanner] Freed port ${PORT} (stopped PID ${pid})`);
                }
                catch {
                }
            }
        }
    }
    catch {
    }
}
if (process.platform === "win32") {
    freeOnWindows();
}
else {
    freeOnUnix();
}

