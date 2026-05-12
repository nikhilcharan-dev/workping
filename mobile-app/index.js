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
 * ── OFFLINE ATTENDANCE SYNC (foundation in place) ────────────────────────────
 * Storage:   expo-sqlite — local queue (timestamp + face_image_b64 + location)
 * Detector:  @react-native-community/netinfo — reachability probe configured
 *            below against https://api.workping.live/api/v1/health
 * Flush:     When the listener fires with isConnected && isInternetReachable,
 *            global.__WP_FLUSH_OFFLINE_QUEUE__() drains the SQLite queue in
 *            chronological order to the Core API. The handler itself is
 *            registered in src/services/offlineQueue.js when the App tree
 *            mounts. This makes field staff and low-connectivity warehouses
 *            usable without a permanent network.
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
import './services/offlineQueue'; // Ensure offline queue handler is registered before NetInfo listener

// ── Offline attendance sync ─────────────────────────────────────────────────
// Configure NetInfo to probe a known WorkPing endpoint (avoids false positives
// where the device has WiFi but no actual internet — common in office routers
// with captive portals or expired DHCP leases).
NetInfo.configure({ reachabilityUrl: 'https://api.workping.live/api/v1/health' });
NetInfo.addEventListener(state => {
  try {
    if (state.isConnected && state.isInternetReachable) {
      if (typeof global.__WP_FLUSH_OFFLINE_QUEUE__ !== 'function') {
        console.warn('[WorkPing] Offline queue handler not yet registered. Retrying in 1s.');
        setTimeout(() => {
          try {
            if (typeof global.__WP_FLUSH_OFFLINE_QUEUE__ === 'function') {
              global.__WP_FLUSH_OFFLINE_QUEUE__();
            } else {
              console.error('[WorkPing] Offline queue handler still not registered after retry.');
            }
          } catch (retryError) {
            console.error('[WorkPing] Error flushing offline queue on retry:', retryError.message);
          }
        }, 1000);
        return;
      }
      global.__WP_FLUSH_OFFLINE_QUEUE__();
    }
  } catch (error) {
    console.error('[WorkPing] Unhandled error in NetInfo listener:', error.message);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// In Expo Go or a native build, this is the single entry point picked up by
// the JS runtime — everything above must complete synchronously before mount.
registerRootComponent(App);
