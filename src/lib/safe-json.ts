export function safeJsonParse<T>(raw: string | null | undefined): T | null {
    if (raw == null || !raw.trim())
        return null;
    try {
        return JSON.parse(raw) as T;
    }
    catch {
        return null;
    }
}

