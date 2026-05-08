import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { navigationRef } from "@/helpers/navigationRef";
import httpClient from "@/helpers/httpClient";

// Notification behaviour while app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// ---------- Android channel ----------

export const CHANNEL_ID = "workping-default";

export async function setupAndroidChannel() {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "WorkPing Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#3762EA",
        sound: true,
        enableVibrate: true,
        showBadge: true,
    });
}

// ---------- Permission + token ----------

export async function requestPermissionsAndGetToken() {
    if (!Device.isDevice) {
        // Physical device required for push tokens
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        return null;
    }

    await setupAndroidChannel();

    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "workping-mobile", // matches app.json slug
    });

    return tokenData.token;
}

// ---------- Backend registration ----------

export async function registerTokenWithBackend(token, role) {
    if (!token) return;
    const endpoint = role === "admin" ? "/api/admin/push-token" : "/api/user/push-token";
    try {
        await httpClient.post(endpoint, {
            token,
            platform: Platform.OS,
        });
    } catch {
        // Non-critical — continue silently
    }
}

export async function unregisterTokenFromBackend(token, role) {
    if (!token) return;
    const endpoint = role === "admin" ? "/api/admin/push-token" : "/api/user/push-token";
    try {
        await httpClient.delete(endpoint, { data: { token } });
    } catch {
        // Non-critical
    }
}

// ---------- Navigation routing on tap ----------

// Keeps track of current role so the tap handler can navigate to the right root
let _currentRole = "user";
export const setCurrentRole = (role) => {
    _currentRole = role;
};

const SCREEN_ROUTES = {
    attendance: (rootScreen) => [rootScreen, { screen: "Attendance" }],
    project: (rootScreen) => [rootScreen, { screen: "Projects" }],
    employee: (rootScreen) => [rootScreen, { screen: "EmployeeList" }],
    notification: (rootScreen) => [rootScreen, { screen: "Notifications" }],
    default: (rootScreen) => [rootScreen, { screen: "Notifications" }],
};

export function routeNotificationTap(data) {
    const nav = navigationRef.current;
    if (!nav?.isReady()) return;

    const rootScreen = _currentRole === "admin" ? "Admin" : "User";
    const resolver = SCREEN_ROUTES[data?.type] ?? SCREEN_ROUTES.default;
    const [name, params] = resolver(rootScreen);

    nav.navigate(name, params);
}

// ---------- Badge helpers ----------

export const clearBadge = () => Notifications.setBadgeCountAsync(0);

export const getBadgeCount = () => Notifications.getBadgeCountAsync();
