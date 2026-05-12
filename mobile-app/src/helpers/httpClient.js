import axios from "axios";
import { DeviceEventEmitter } from "react-native";
import { API_BASE_URL } from "@/helpers/config";
import logStore from "@/helpers/logStore";
import { getSession, setSession, clearSession } from "@/helpers/sessionStorage";
import runtimeConfig from "./runtimeConfig";

// Global request timeout so an unreachable host can't pin a request open forever.
// 30s matches the longest legitimate face-recognition poll.
const httpClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

// ── Refresh token state ──────────────────────────────────────────────────────
// Only one refresh request should be in-flight at a time. All other 401'd
// requests queue behind the same promise.
let isRefreshing = false;
let refreshPromise = null;

async function attemptTokenRefresh() {
    const session = await getSession();
    if (!session?.refreshToken) return null;

    const baseUrl = await runtimeConfig.init();

    const res = await axios.post(
        `${baseUrl}/api/auth/refresh`,
        {
            refreshToken: session.refreshToken,
        },
        {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "WorkPing Agent",
                Origin: "https://workping.live",
            },
            timeout: 10000,
        }
    );

    const data = res.data?.data ?? res.data;
    if (!data?.token) return null;

    // Update stored session with new tokens in the same store the AuthProvider
    // reads from. The previous AsyncStorage write was invisible to the rest
    // of the app, so refresh appeared to "succeed" while the bearer never
    // updated on the next request.
    await setSession({ ...session, token: data.token, refreshToken: data.refreshToken });

    return data.token;
}

// ── Request interceptor ──────────────────────────────────────────────────────
httpClient.interceptors.request.use(
    async (config) => {
        // Initialize runtime config if not already done
        let currentBaseUrl = await runtimeConfig.init();

        // Safety check: ensure http:// or https:// prefix
        if (currentBaseUrl && !currentBaseUrl.startsWith("http://") && !currentBaseUrl.startsWith("https://")) {
            currentBaseUrl = `http://${currentBaseUrl}`;
        }
        config.baseURL = currentBaseUrl;

        try {
            const session = await getSession();
            if (session?.token) {
                config.headers.Authorization = `Bearer ${session.token}`;
            }
        } catch (error) {
            // Error loading token
            console.error("[HttpClient] Error loading session:", error);
        }

        // Add custom headers to bypass CORS/Anti-bot checks
        config.headers["User-Agent"] = "WorkPing Agent";
        config.headers["Origin"] = "https://workping.live";

        // Log the request
        const fullUrl = (config.baseURL || "") + config.url;
        console.log(`[HttpClient] Request: ${config.method?.toUpperCase()} ${fullUrl}`);

        logStore.addLog({
            type: "request",
            method: config.method?.toUpperCase(),
            url: fullUrl,
            data: config.data,
            headers: config.headers,
        });

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ── Response interceptor ─────────────────────────────────────────────────────
httpClient.interceptors.response.use(
    (response) => {
        // Log success response
        const fullUrl = (response.config.baseURL || "") + response.config.url;
        logStore.addLog({
            type: "response",
            status: response.status,
            url: fullUrl,
            data: response.data,
            timestamp: new Date().toISOString(),
        });

        // Unwrap standardised server envelope: { type: "success", message, data }
        // Also handles simple single-field wrappers: { data: {...} } or { res: {...} }
        const d = response.data;
        if (d && typeof d === "object" && !Array.isArray(d)) {
            // 1. Standard envelope: { type: "success", data: ... }
            if (d.type === "success" && "data" in d) {
                response.data = d.data;
            }
            // 2. Simple data wrapper: { data: ... }
            else if (Object.keys(d).length === 1 && d.data !== undefined) {
                response.data = d.data;
            }
            // 3. Result wrapper: { res: ... }
            else if (Object.keys(d).length === 1 && d.res !== undefined) {
                response.data = d.res;
            }
        }

        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const fullUrl = error.config ? (error.config.baseURL || "") + error.config.url : "Unknown";

        // Log error response
        logStore.addLog({
            type: "error",
            status: error.response?.status,
            message: error.message,
            url: fullUrl,
            data: error.response?.data,
            timestamp: new Date().toISOString(),
        });

        console.log(`[HttpClient] Error: ${error.response?.status} ${fullUrl}`, error.response?.data);

        const status = error.response?.status;
        const code = error.response?.data?.code;

        // ── Token expired → attempt silent refresh ──────────────────────────────
        if (status === 401 && code === "TOKEN_EXPIRED" && !originalRequest._retried) {
            originalRequest._retried = true;

            try {
                // Coalesce concurrent refresh attempts into a single request
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshPromise = attemptTokenRefresh().finally(() => {
                        isRefreshing = false;
                        refreshPromise = null;
                    });
                }

                const newToken = await refreshPromise;

                if (newToken) {
                    // Retry the original request with the fresh token
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return httpClient(originalRequest);
                }
            } catch (refreshError) {
                console.log("[HttpClient] Refresh failed, clearing session");
            }

            // Refresh failed — clear session so user gets redirected to login
            DeviceEventEmitter.emit("session_expired");
            await clearSession();
            return Promise.reject(error);
        }

        // ── Unauthorized (invalid/missing token) → clear session ──────────────
        // Note: 403 means "forbidden" (wrong role), not "invalid session" — don't logout
        if (status === 401) {
            DeviceEventEmitter.emit("session_expired");
            await clearSession();
        }

        return Promise.reject(error);
    }
);

export default httpClient;
