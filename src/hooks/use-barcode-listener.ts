"use client";
import { useCallback, useEffect, useRef } from "react";
import { parseJsonResponse } from "@/lib/parse-json-response";
const SCANNER_WS = "wss://127.0.0.1:5443";
export function useBarcodeListener(onScan: (barcode: string) => void) {
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;
    const stableOnScan = useCallback((code: string) => {
        onScanRef.current(code);
    }, []);
    useEffect(() => {
        let ws: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let closed = false;
        let wsConnected = false;
        const connect = () => {
            if (closed)
                return;
            try {
                ws = new WebSocket(SCANNER_WS);
                ws.onopen = () => {
                    wsConnected = true;
                };
                ws.onmessage = (ev) => {
                    try {
                        const msg = JSON.parse(String(ev.data)) as {
                            type?: string;
                            barcode?: string;
                        };
                        if (msg.type === "scan" && msg.barcode) {
                            stableOnScan(String(msg.barcode).trim());
                        }
                    }
                    catch {
                    }
                };
                ws.onclose = () => {
                    wsConnected = false;
                    if (!closed) {
                        reconnectTimer = setTimeout(connect, 2500);
                    }
                };
                ws.onerror = () => ws?.close();
            }
            catch {
                reconnectTimer = setTimeout(connect, 2500);
            }
        };
        connect();
        const poll = setInterval(async () => {
            if (wsConnected)
                return;
            try {
                const res = await fetch("/api/products/barcode-event");
                if (!res.ok)
                    return;
                const data = await parseJsonResponse<{
                    barcode?: string | null;
                }>(res);
                if (data.barcode)
                    stableOnScan(String(data.barcode).trim());
            }
            catch {
            }
        }, 1500);
        return () => {
            closed = true;
            if (reconnectTimer)
                clearTimeout(reconnectTimer);
            clearInterval(poll);
            ws?.close();
        };
    }, [stableOnScan]);
}

