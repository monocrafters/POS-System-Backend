/** Push local SQLite rows to Supabase PostgreSQL tables after changes (including deletes). */
export function triggerCloudBackup(): void {
    import("@/lib/sync/sync-service")
        .then(({ runFullSync }) => runFullSync())
        .catch((err) => console.error("[cloud-backup]", err));
}
