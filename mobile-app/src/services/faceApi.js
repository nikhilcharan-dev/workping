/**
 * Face Recognition API client.
 *
 * Endpoints:
 *   POST /api/user/attendance/verify-mark-attendance — recognize face, record attendance
 *   POST /api/user/attendance/verify-location        — verify device is in an allowed region
 *   GET  /                                           — server health
 *   GET  /api/user/attendance/by-date                — today's attendance records
 *
 * Location gating: useFaceCapture runs verifyLocation once on mount and caches the result
 * in locationLockState. detect() does NOT re-verify — the hook gates the call upstream.
 * The server reads the client's public IP directly from the request headers.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import httpClient from "@/helpers/httpClient";
import runtimeConfig from "@/helpers/runtimeConfig";
import { AUTH_STORAGE_KEY } from "@/context/constants";

const API_TIMEOUT = 10000;
const HEALTH_TIMEOUT = 3000;
const RETRY_COUNT = 2;
const RETRY_DELAYS = [500, 1000]; // increasing delay

/** Get the current bearer token from storage */
async function getBearerToken() {
    try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored)?.token || null;
    } catch {
        return null;
    }
}

// --- RETRY WRAPPER ---
async function withRetry(fn, retries = RETRY_COUNT) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            const status = err.response?.status;
            // Only retry on network errors or 5xx — never on 4xx
            const isRetryable = !status || status >= 500 || err.code === "ECONNABORTED" || err.code === "ERR_NETWORK";
            if (!isRetryable || attempt === retries) throw err;
            await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt] || 1000));
        }
    }
    throw lastError;
}

/**
 * Normalize the completed status response into the shape FaceCaptureResultCard expects.
 *
 * Server returns: { confidence, status, name, employeeId, profileImage, attendance }
 * Card expects:  { success, confidence, person: { name, employee_id, avatar_url }, attendance }
 */
function normalizeResult(data) {
    return {
        success: true,
        confidence: data.confidence,
        person: {
            name: data.name,
            employee_id: data.employeeId,
            avatar_url: data.profileImage || null,
        },
        attendance: data.attendance,
        raw: data,
    };
}

/**
 * Send a face image to the server for recognition and attendance recording.
 *
 * Location gating is handled upstream by useFaceCapture (verifyLocation on mount).
 * The locationLock snapshot (GPS + altitude/MSL + WiFi) is forwarded to the server
 * for server-side audit. Public IP is NOT sent — the server reads it from the request.
 *
 * @param {object} imageData - { uri, base64 } from image processor
 * @param {object} meta - { deviceId, locationId, timestamp, locationLock }
 * @returns {Promise<object>} Result { success, message, ... }
 */
export async function detect(imageData, meta = {}, onProgress = null) {
    // ── Multipart upload via native fetch ───────────────────────────────────────
    // Axios + FormData in React Native is unreliable (ERR_NETWORK due to XHR
    // multipart handling). React Native's built-in fetch handles FormData
    // correctly and lets the native layer set the proper boundary.
    const baseUrl = await runtimeConfig.init();
    const token = await getBearerToken();

    const params = new URLSearchParams();
    if (meta.deviceId) params.set("deviceId", meta.deviceId);
    if (meta.locationId) params.set("locationId", meta.locationId);
    if (meta.timestamp) params.set("timestamp", meta.timestamp);
    if (meta.locationLock) params.set("locationLock", JSON.stringify(meta.locationLock));

    const formData = new FormData();
    formData.append("frames", {
        uri: imageData.uri,
        name: "face.jpg",
        type: "image/jpeg",
    });

    console.log("[faceApi] detect() → fetch POST", `${baseUrl}/api/user/attendance/verify-mark-attendance`);

    let fetchResp;
    try {
        fetchResp = await Promise.race([
            fetch(`${baseUrl}/api/user/attendance/verify-mark-attendance?${params.toString()}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "User-Agent": "WorkPing Agent",
                    Origin: "https://workping.live",
                    // No Content-Type — let fetch set multipart boundary automatically
                },
                body: formData,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), API_TIMEOUT)),
        ]);
    } catch (err) {
        console.error("[faceApi] fetch failed:", err.message);
        throw err;
    }

    console.log("[faceApi] fetch response status:", fetchResp.status);

    const rawBody = await fetchResp.json().catch(() => ({}));
    console.log("[faceApi] fetch response body:", JSON.stringify(rawBody).slice(0, 200));

    if (!fetchResp.ok) {
        const serverMsg = rawBody?.message || rawBody?.data?.message || `HTTP ${fetchResp.status}`;
        const err = new Error(serverMsg);
        err.response = { status: fetchResp.status, data: rawBody };
        throw err;
    }

    // Unwrap standard envelope { type:"success", data:{...} }
    let submitData = rawBody?.data ?? rawBody;

    const ticketId = submitData.ticketId;
    let currentStatus = submitData.status;

    console.log("[faceApi] ticketId:", ticketId, "status:", currentStatus);

    // If server returned result immediately (no queue)
    if (currentStatus !== "queued" && currentStatus !== "processing") {
        if (!ticketId) {
            // Server didn't return a ticketId — either a deploy issue or Python service error
            throw new Error("Server did not return a recognition ticket. Please try again.");
        }
        return normalizeResult(submitData);
    }

    if (!ticketId) {
        throw new Error("Server did not return a recognition ticket. Please try again.");
    }

    // Poll until completed / failed
    while (currentStatus !== "completed" && currentStatus !== "failed") {
        if (onProgress) onProgress({ status: currentStatus, position: submitData.position });

        await new Promise((r) => setTimeout(r, 2000));

        const pollRes = await withRetry(async () => httpClient.get(`/api/user/attendance/status/${ticketId}`));
        // Unwrap success envelope: { type, message, data: { status, ... } }
        submitData = pollRes.data?.data ?? pollRes.data;
        currentStatus = submitData.status;
        console.log(
            "[faceApi] poll tick — status:",
            currentStatus,
            "submitData:",
            JSON.stringify(submitData).slice(0, 150)
        );
    }

    if (currentStatus === "failed") {
        throw new Error(submitData.error || "Face recognition failed");
    }

    return normalizeResult(submitData);
}

/**
 * Verify if the user is in an allowed region before marking attendance.
 * POST /api/user/attendance/verify-location
 */
export async function verifyLocation(locationData) {
    return withRetry(async () => {
        const response = await httpClient.post("/api/user/attendance/verify-location", locationData, { timeout: 5000 });
        return response.data;
    }, 1); // Only 1 retry for pre-check
}

/**
 * Enroll the authenticated user's own face.
 * Sends a single JPEG frame to the server which extracts the embedding
 * and persists it in MongoDB.
 *
 * @param {object} imageData - { uri, base64? } from image picker / camera
 * @returns {Promise<{ success, employeeId, name }>}
 */
export async function registerFace(imageData) {
    return withRetry(async () => {
        const formData = new FormData();
        formData.append("face_photo", {
            uri: imageData.uri,
            name: "face.jpg",
            type: "image/jpeg",
        });

        const response = await httpClient.post("/api/user/face/enroll", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 30000,
        });
        return response.data;
    });
}

/**
 * Check whether the authenticated user has a face registered.
 * GET /api/user/face/status
 * @returns {Promise<{ registered: boolean }>}
 */
export async function getFaceStatus() {
    const response = await httpClient.get("/api/user/face/status", { timeout: 8000 });
    return response.data;
}

/**
 * Health check — verify server is reachable.
 */
export async function healthCheck() {
    const response = await httpClient.get("/", {
        timeout: HEALTH_TIMEOUT,
    });
    return response.data;
}

/**
 * Get today's attendance records for the logged in user.
 */
export async function getAttendance(date) {
    const response = await httpClient.get("/api/user/attendance/by-date", {
        params: { date },
    });
    return response.data;
}
