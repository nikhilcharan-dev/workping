/**
 * Offline attendance queue — SQLite-backed.
 *
 * Init is async (SQLite.openDatabaseAsync + CREATE TABLE) so this module
 * exposes `offlineQueueReady` — a Promise resolving to true once the DB is
 * usable, or false if init failed. The NetInfo listener in index.js awaits
 * this promise before flushing, so reconnect events that arrive before the
 * DB is open suspend instead of racing a non-function global.
 *
 * Rows carry a `kind` discriminator. `json` rows replay through the shared
 * httpClient (auth refresh, logging, envelope unwrap all apply uniformly).
 * `attendance` rows replay via multipart fetch using the same FormData path
 * faceApi.detect() uses — required because RN's axios + FormData is unreliable
 * with multipart and the server expects a multipart upload.
 */

import * as SQLite from "expo-sqlite";
// Legacy import path: SDK 55 moved the procedural FileSystem API to a /legacy
// subpath in favour of the new File/Directory classes. We use the procedural
// API here because the surface area we need (copy, delete, mkdir) is small.
import * as FileSystem from "expo-file-system/legacy";
import httpClient from "@/helpers/httpClient";
import runtimeConfig from "@/helpers/runtimeConfig";
import { getBearerToken } from "@/helpers/sessionStorage";

const DB_NAME = "workping_offline.db";
const ATTENDANCE_TIMEOUT_MS = 30000;
const QUEUE_DIR = `${FileSystem.documentDirectory}offline-queue/`;

function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

let db = null;
let flushing = false;

// 4xx → drop the row, the request is permanently bad (auth missing, payload
// shape changed, etc.). 5xx and network errors → preserve order, retry later.
function isPermanentFailure(err) {
    const status = err?.response?.status;
    return typeof status === "number" && status >= 400 && status < 500;
}

async function flushJson(row) {
    const body = JSON.parse(row.payload);
    await httpClient.post(row.endpoint, body);
}

async function flushAttendance(row) {
    const { imageUri, meta = {} } = JSON.parse(row.payload);
    const baseUrl = await runtimeConfig.init();
    const token = await getBearerToken();

    const params = new URLSearchParams();
    if (meta.deviceId) params.set("deviceId", meta.deviceId);
    if (meta.locationId) params.set("locationId", meta.locationId);
    if (meta.timestamp) params.set("timestamp", meta.timestamp);
    if (meta.locationLock) params.set("locationLock", JSON.stringify(meta.locationLock));

    const formData = new FormData();
    formData.append("frames", { uri: imageUri, name: "face.jpg", type: "image/jpeg" });

    const resp = await Promise.race([
        fetch(`${baseUrl}${row.endpoint}?${params.toString()}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": "WorkPing Agent",
                Origin: "https://workping.live",
                ...(row.idempotency_key && { "Idempotency-Key": row.idempotency_key }),
            },
            body: formData,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ATTENDANCE_TIMEOUT_MS)),
    ]);

    if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const err = new Error(data?.message || `HTTP ${resp.status}`);
        err.response = { status: resp.status, data };
        throw err;
    }
}

const DISPATCH = {
    json: flushJson,
    attendance: flushAttendance,
};

async function flushQueue() {
    if (!db || flushing) return;
    flushing = true;
    try {
        const rows = await db.getAllAsync(
            "SELECT id, kind, endpoint, payload, idempotency_key FROM attendance_queue ORDER BY created_at ASC"
        );
        for (const row of rows) {
            const handler = DISPATCH[row.kind] || flushJson;
            try {
                await handler(row);
                await deleteRowSideEffects(row);
                await db.runAsync("DELETE FROM attendance_queue WHERE id = ?", row.id);
            } catch (err) {
                console.error("[WorkPing] Flush failed at row", row.id, err.message);
                if (isPermanentFailure(err)) {
                    console.warn("[WorkPing] Dropping permanently-failed row", row.id);
                    try { await deleteRowSideEffects(row); } catch { /* best-effort */ }
                    await db.runAsync("DELETE FROM attendance_queue WHERE id = ?", row.id);
                    continue;
                }
                // Transient — stop to preserve chronological order on the next retry.
                break;
            }
        }
    } finally {
        flushing = false;
    }
}

async function enqueue({ kind = "json", endpoint, payload }) {
    if (!db) throw new Error("Offline queue not ready");
    const idempotency_key = generateUUID();
    await db.runAsync(
        "INSERT INTO attendance_queue (created_at, kind, endpoint, payload, idempotency_key) VALUES (?, ?, ?, ?, ?)",
        Date.now(),
        kind,
        endpoint,
        JSON.stringify(payload),
        idempotency_key
    );
}

/**
 * Copy a cached image into the persistent offline-queue directory so it
 * survives OS cache purges between enqueue and flush. Returns the new URI
 * to embed in the queue payload.
 */
async function persistImageForQueue(sourceUri) {
    const dirInfo = await FileSystem.getInfoAsync(QUEUE_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(QUEUE_DIR, { intermediates: true });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const destUri = QUEUE_DIR + filename;
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    return destUri;
}

// Best-effort cleanup of any persisted file referenced by the row. Guarded by
// a prefix check so we never delete a file outside the queue directory.
async function deleteRowSideEffects(row) {
    if (row.kind !== "attendance") return;
    const { imageUri } = JSON.parse(row.payload);
    if (imageUri && imageUri.startsWith(QUEUE_DIR)) {
        await FileSystem.deleteAsync(imageUri, { idempotent: true });
    }
}

export const offlineQueueReady = (async () => {
    try {
        db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS attendance_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at INTEGER NOT NULL,
                kind TEXT NOT NULL DEFAULT 'json',
                endpoint TEXT NOT NULL,
                payload TEXT NOT NULL,
                idempotency_key TEXT
            );
        `);
        // Migrate existing installs that lack the idempotency_key column.
        await db.execAsync(
            "ALTER TABLE attendance_queue ADD COLUMN idempotency_key TEXT"
        ).catch(() => { /* column already exists — safe to ignore */ });
        return true;
    } catch (err) {
        console.error("[WorkPing] Offline queue init failed:", err.message);
        db = null;
        return false;
    }
})();

export { flushQueue, enqueue, persistImageForQueue };
export default { offlineQueueReady, flushQueue, enqueue, persistImageForQueue };
