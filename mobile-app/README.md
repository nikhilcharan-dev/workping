# WorkPing Mobile

React Native mobile app for WorkPing. Allows employees to check in/out using face recognition, track attendance history, submit leave requests, and receive push notifications — on both Android and iOS.

## Tech Stack

- **Framework**: React Native 0.83 via Expo 55
- **Navigation**: React Navigation (stack + bottom tabs)
- **Camera / Face**: react-native-vision-camera + react-native-vision-camera-face-detector (on-device face bounding-box detection); captured frame is sent to the biometric service for embedding extraction
- **Offline Sync**: @react-native-community/netinfo (connectivity detection) + expo-sqlite (local queue); check-ins captured offline are flushed to the API on reconnect via the NetInfo listener in index.js
- **Audio**: expo-audio + expo-speech (voice feedback for check-in confirmation; foundation for voice chatbot interaction)
- **Forms**: React Hook Form + Yup
- **Location**: Expo Location (GPS-based geofence validation)
- **Push Notifications**: Expo Notifications
- **HTTP**: Axios

## Getting Started

```bash
npm install
cp .env.example .env   # set API_URL

# Start Expo dev server
npx expo start

# Run on Android emulator
npx expo run:android

# Run on iOS simulator (macOS only)
npx expo run:ios
```

## Environment Variables

| Variable | Description |
|---|---|
| `API_URL` | URL of the centralized API server (no trailing slash) |

## Project Structure

```
src/
├── components/    # Shared UI components
├── screens/       # App screens (Login, Home, Attendance, Leaves, ...)
├── navigation/    # Stack and tab navigators
├── services/      # API call wrappers (Axios)
├── helpers/       # Formatting, date utilities
└── theme/         # Colors, typography, spacing
```

## Permissions Required

| Permission | Purpose |
|---|---|
| `CAMERA` | Face recognition check-in |
| `ACCESS_FINE_LOCATION` | Geofence validation for on-site check-in |
| `NOTIFICATIONS` | Shift reminders, leave approval alerts |
| `VIBRATE` | Haptic feedback |

## Building for Production

```bash
# EAS Build (recommended)
npx eas build --platform android
npx eas build --platform ios

# Local Android release build
cd android && ./gradlew assembleRelease
```

> Never commit `android/local.properties` — it contains absolute paths to your local Android SDK.

## Related Services

- [workping-api](../centralized-server/server) — core backend
- [workping-biometric](../face-api-microservice) — face recognition engine
