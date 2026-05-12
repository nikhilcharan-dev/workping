/**
 * ============================================================================
 * WorkPing Mobile App — Entry Point
 * ============================================================================
 *
 * React Native + Expo 55 application for biometric attendance, GPS-validated
 * check-in, leave requests, payslips, and offline-resilient field operations.
 *
 * ── MODULE WIRING ────────────────────────────────────────────────────────────
 * • registerRootComponent(App)              — Expo bootstrap (final line)
 * • NetInfo offline-sync listener           — see Offline Attendance Sync below
 *
 * ── FACE RECOGNITION CHECK-IN ────────────────────────────────────────────────
 * Screen:  src/screens/FaceCaptureScreen.jsx
 * Hook:    src/hooks/useFaceCapture.js
 * Engine:  react-native-vision-camera + react-native-vision-camera-face-detector
 *          (on-device bounding-box detection; live face frame is sent to
 *           face-api-microservice/app.py → POST /api/v1/detect)
 * Phase 2 mobile liveness: blink/turn challenge using the same face-detector
 *          before the frame leaves the device.
 *
 * ── GPS + WIFI GEOFENCE VALIDATION ───────────────────────────────────────────
 * Pure collector (no React):  src/utils/locationLock.js
 *     - getWifiInfo()         : NetInfo SSID/BSSID/strength, 2s timeout
 *     - getGpsSnapshot()      : expo-location High accuracy, 3s timeout
 *                               returns { latitude, longitude, accuracy,
 *                                         altitude (MSL on iOS / WGS84 Android),
 *                                         altitudeAccuracy }
 *     - computeLocationStatus : "full" | "partial" | "unavailable"
 *     - collectLocationSnapshot() : Promise.allSettled wraps both probes so
 *                                   one failure never blocks the other
 * React hook:  src/hooks/useLocationLock.js
 *     - Foreground permission check on mount, GPS warm-up if granted
 *     - requestPermissions() prompts user
 *     - collectSnapshot() returns the snapshot to FaceCaptureScreen
 * Server-side distance validation:
 *     centralized-server/server/utils/location.js  (haversine + WiFi BSSID
 *     match against the organisation's registered office network)
 * Public IP is deliberately NOT collected on the device — the server reads
 * it from X-Forwarded-For / req.ip so the client can't spoof it.
 *
 * ── OFFLINE ATTENDANCE SYNC ──────────────────────────────────────────────────
 * Storage:   expo-sqlite — local queue with columns (id, kind, created_at,
 *            endpoint, payload). Owned by src/services/offlineQueue.js. The
 *            IIFE in that module exposes `offlineQueueReady` (Promise<boolean>)
 *            so callers can await DB readiness instead of racing a global
 *            handoff that could fire before SQLite was open.
 * Detector:  @react-native-community/netinfo — reachability probe configured
 *            below against https://api.workping.live/api/v1/health
 * Flush:     When the listener fires with isConnected && isInternetReachable,
 *            it awaits offlineQueueReady and then calls flushQueue(), which
 *            drains rows in chronological order. `attendance` rows replay
 *            through multipart fetch (same FormData path faceApi.detect uses).
 *            `json` rows replay through the shared httpClient so auth refresh
 *            and logging interceptors still apply. 4xx responses drop the
 *            poison row to prevent queue jams; 5xx and network errors stop
 *            the drain so chronological order is preserved on the next retry.
 * Producer:  useFaceCapture.js enqueues an `attendance` row when detect()
 *            fails with no server response (network or timeout). The cropped
 *            face image is first copied via expo-file-system into the app's
 *            documents directory (FileSystem.documentDirectory + 'offline-queue/')
 *            so the file survives OS cache purges between enqueue and flush.
 *            The persistent URI is stored in the payload; the file is deleted
 *            after a successful upload or a 4xx permanent drop.
 *
 * ── AUTH + SECURE STORAGE ────────────────────────────────────────────────────
 * Tokens stored in expo-secure-store (encrypted Keychain on iOS, EncryptedSharedPreferences on Android).
 * JWT access (7-day TTL on mobile) + refresh token (30-day TTL) rotation.
 * OAuth:  Google + Microsoft via expo-web-browser; tokens issued by the
 *         Core API at centralized-server/server/services/{google,microsoft}/.
 *
 * ── PUSH NOTIFICATIONS (Integrated) ──────────────────────────────────────────
 * expo-notifications + permissions declared in app.json. Used for shift
 * reminders, leave-approval events, and subscription renewal alerts.
 *
 * ── VOICE FOUNDATION ─────────────────────────────────────────────────────────
 * expo-audio (record OGG) + expo-speech (TTS). The matching server-side
 * pipeline is in whatsapp-microservice/package.json (@aws-sdk/client-transcribe,
 * @aws-sdk/client-polly) — wiring is a future scope item.
 * ============================================================================
 */

import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import NetInfo from '@react-native-community/netinfo';

import App from './App';
import { offlineQueueReady, flushQueue } from '@/services/offlineQueue';

// ── Offline attendance sync ─────────────────────────────────────────────────
// Configure NetInfo to probe a known WorkPing endpoint (avoids false positives
// where the device has WiFi but no actual internet — common in office routers
// with captive portals or expired DHCP leases).
NetInfo.configure({ reachabilityUrl: 'https://api.workping.live/api/v1/health' });
let isFlushing = false;
NetInfo.addEventListener(async state => {
  if (!(state.isConnected && state.isInternetReachable)) return;
  if (isFlushing) return;
  isFlushing = true;

  try {
    // Await the offline-queue init promise instead of polling a global. If the
    // DB failed to open (SQLite unavailable, disk full, etc.) `ready` is false
    // and we skip the flush rather than calling a non-function.
    const ready = await offlineQueueReady;
    if (!ready) {
      console.warn('[WorkPing] Skipping flush — offline queue init failed.');
      return;
    }
    await flushQueue();
  } catch (error) {
    console.error('[WorkPing] Unhandled error in NetInfo listener:', error.message);
  } finally {
    isFlushing = false;
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// In Expo Go or a native build, this is the single entry point picked up by
// the JS runtime — everything above must complete synchronously before mount.
registerRootComponent(App);
