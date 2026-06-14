export interface SyncResult {
    success: boolean;
    skipped?: boolean;
    reason?: string;
    pulled: number;
    pushed: number;
    syncedAt: string;
    error?: string;
}
export interface SyncStatusResponse {
    configured: boolean;
    online: boolean;
    lastSyncAt: string | null;
    lastStatus: string;
    lastError: string | null;
    recordsPulled: number;
    recordsPushed: number;
    totalRecords: number;
    pendingRecords: number;
    percentBackedUp: number;
}

