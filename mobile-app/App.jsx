/**
 * ============================================================================
 * WorkPing Mobile App — Root <App /> component
 * ============================================================================
 *
 * Mounted by index.js via registerRootComponent. Composes the provider tree
 * and hands off to <RootNavigator />.
 *
 * ── PROVIDER STACK (outer → inner) ──────────────────────────────────────────
 *   GestureHandlerRootView          — react-native-gesture-handler root
 *   SafeAreaProvider                — safe-area insets for notched devices
 *     └── AuthProvider              — JWT (7-day access + 30-day refresh)
 *                                     persisted in expo-secure-store
 *     └── LayoutProvider            — theme + tab bar state
 *         └── ThemeProvider         — light/dark per LayoutContext
 *             └── NotificationProvider     — in-app toasts + alerts
 *                 └── PushNotificationProvider  — expo-notifications +
 *                                                  device token registration
 *                                                  with the Core API
 *                     └── ChatProvider          — WhatsApp + in-app chat
 *                     └── EmailProvider         — mailbox state
 *                         └── <RootNavigator />   — @react-navigation/native
 *                             ├── bottom-tabs    — Home, Attendance, Profile
 *                             └── native-stack   — auth flow + modals
 *
 * ── KEY MOBILE FEATURES ─────────────────────────────────────────────────────
 *   • Face check-in     — src/screens/FaceCaptureScreen.jsx +
 *                          src/hooks/useFaceCapture.js. Uses
 *                          react-native-vision-camera + the
 *                          react-native-vision-camera-face-detector plugin
 *                          for on-device bounding-box detection. The captured
 *                          frame is sent to face-api-microservice/app.py
 *                          POST /api/v1/detect for cosine similarity match.
 *   • GPS + WiFi geofence — src/utils/locationLock.js +
 *                            src/hooks/useLocationLock.js. Collects WiFi
 *                            SSID/BSSID/strength (2s timeout) and GPS
 *                            lat/lng/altitude (3s timeout) wrapped in
 *                            Promise.allSettled so one failure doesn't
 *                            block the other. Server-side haversine
 *                            verification in centralized-server/server/
 *                            utils/location.js. Public IP is intentionally
 *                            NOT collected on device — server reads X-
 *                            Forwarded-For so clients can't spoof.
 *   • Offline sync       — index.js installs a NetInfo listener that
 *                          flushes queued check-ins (expo-sqlite) to the
 *                          Core API on reconnect via
 *                          global.__WP_FLUSH_OFFLINE_QUEUE__.
 *   • Push notifications — expo-notifications. Device token registered
 *                          with the Core API on first launch; shift
 *                          reminders + leave-approval events delivered.
 *   • Auth               — Google + Microsoft OAuth via expo-web-browser;
 *                          tokens issued by centralized-server/server/
 *                          services/{google,microsoft}/.
 *
 * ── DEV-ONLY API LOG VIEWER ─────────────────────────────────────────────────
 * src/components/ApiLogViewer is loaded ONLY in __DEV__ (require gated below)
 * so the production bundle stays free of debug tooling.
 *
 * ── LogBox SUPPRESSION (note: NOT console.error suppression) ────────────────
 * LogBox.ignoreLogs() controls only the in-development RED/YELLOW overlay.
 * It does NOT modify console.error or console.warn — production builds are
 * unaffected. The patterns below are anchored to known-benign Expo internal
 * warnings on Android when the activity is recreated.
 * ============================================================================
 */
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

// LogBox.ignoreLogs only affects the in-dev LogBox overlay (not console).
LogBox.ignoreLogs([
  "Error: Call to function 'ExpoKeepAwake.activate' has been rejected",
  "The current activity is no longer available"
]);

import { ThemeProvider } from '@/theme';
import { AuthProvider } from '@/context/useAuthContext';
import { LayoutProvider, useLayoutContext } from '@/context/useLayoutContext';
import { NotificationProvider } from '@/context/useNotificationContext';
import { PushNotificationProvider } from '@/context/usePushNotificationContext';
import { ChatProvider } from '@/context/useChatContext';
import { EmailProvider } from '@/context/useEmailContext';
import RootNavigator from '@/navigation';
let ApiLogViewer = null;
if (__DEV__) {
  ApiLogViewer = require('@/components/ApiLogViewer').default;
}

const AppContent = () => {
  const { themeMode } = useLayoutContext();

  return (
    <ThemeProvider themeMode={themeMode}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <NotificationProvider>
        <PushNotificationProvider>
          <ChatProvider>
            <EmailProvider>
              <View style={{ flex: 1 }}>
                <RootNavigator />
                {__DEV__ && ApiLogViewer ? <ApiLogViewer /> : null}
                <Toast />
              </View>
            </EmailProvider>
          </ChatProvider>
        </PushNotificationProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LayoutProvider>
            <AppContent />
          </LayoutProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
