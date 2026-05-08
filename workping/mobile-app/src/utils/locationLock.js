/**
 * Location lock — collect WiFi + GPS + altitude (MSL) signals for attendance verification.
 * Pure functions, no React dependencies. Never throws — always returns best-effort.
 *
 * NOTE: Public IP is intentionally NOT collected here.
 *       The server reads the client IP from the incoming request headers (X-Forwarded-For / remoteAddress).
 */

import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";

const WIFI_TIMEOUT_MS = 2000;
const GPS_TIMEOUT_MS = 3000;

// --- WIFI ---

function isUnknownSsid(ssid) {
    return !ssid || ssid === "<unknown ssid>" || ssid === "0x";
}

export async function getWifiInfo() {
    let timer;
    try {
        const result = await Promise.race([
            NetInfo.fetch(),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error("WiFi timeout")), WIFI_TIMEOUT_MS);
            }),
        ]);
        clearTimeout(timer);

        if (result.type !== "wifi" || !result.isConnected || !result.details) {
            return null;
        }

        const { ssid, bssid, strength } = result.details;

        // Android returns <unknown ssid> if location permission is denied
        if (isUnknownSsid(ssid)) {
            return null;
        }

        return {
            ssid: ssid || null,
            bssid: bssid || null,
            strength: typeof strength === "number" ? strength : null,
        };
    } catch {
        clearTimeout(timer);
        return null;
    }
}

// --- GPS + ALTITUDE ---

export async function getGpsSnapshot() {
    let timer;
    try {
        const result = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error("GPS timeout")), GPS_TIMEOUT_MS);
            }),
        ]);
        clearTimeout(timer);

        const { latitude, longitude, altitude, accuracy, altitudeAccuracy } = result.coords;

        return {
            gps: {
                latitude,
                longitude,
                accuracy: accuracy != null ? Math.round(accuracy * 10) / 10 : null,
            },
            altitude: {
                value: altitude != null ? Math.round(altitude * 10) / 10 : null,
                reference: Platform.OS === "ios" ? "msl" : "wgs84",
                accuracy: altitudeAccuracy != null ? Math.round(altitudeAccuracy * 10) / 10 : null,
            },
        };
    } catch {
        clearTimeout(timer);
        return null;
    }
}

// --- STATUS ---

export function computeLocationStatus(wifi, gps, altitude) {
    const hasWifi = wifi !== null;
    const hasGps = gps !== null;
    const hasAlt = altitude !== null && altitude.value !== null;

    if (hasWifi && hasGps && hasAlt) return "full";
    if (hasWifi || hasGps) return "partial";
    return "unavailable";
}

// --- MAIN COLLECTOR ---
// Collects GPS coordinates (lat/lng) and altitude (MSL on iOS, WGS84 on Android) + WiFi.
// Public IP is NOT collected — the server reads it from the incoming request headers.

export async function collectLocationSnapshot() {
    try {
        const [wifiResult, gpsResult] = await Promise.allSettled([getWifiInfo(), getGpsSnapshot()]);

        const wifi = wifiResult.status === "fulfilled" ? wifiResult.value : null;
        const gpsData = gpsResult.status === "fulfilled" ? gpsResult.value : null;

        const gps = gpsData?.gps || null;
        const altitude = gpsData?.altitude || null;

        return {
            wifi,
            gps,
            altitude,
            status: computeLocationStatus(wifi, gps, altitude),
            platform: Platform.OS,
            collected_at: new Date().toISOString(),
        };
    } catch {
        return {
            wifi: null,
            gps: null,
            altitude: null,
            status: "unavailable",
            platform: Platform.OS,
            collected_at: new Date().toISOString(),
        };
    }
}
