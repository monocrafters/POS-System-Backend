export async function register() {
    // Database bootstrap runs from /api/health (Node route) so Electron dev can wait on it
    // without pulling Node-only modules into the instrumentation bundle.
}
