import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import {
    requestPermissionsAndGetToken,
    registerTokenWithBackend,
    unregisterTokenFromBackend,
    routeNotificationTap,
    setCurrentRole,
    clearBadge,
} from "@/services/pushNotificationService";
import { preloadSounds, unloadSounds } from "@/services/soundService";
import { useAuthContext } from "./useAuthContext";
import { useNotificationContext } from "./useNotificationContext";

const PushNotificationContext = createContext(undefined);

export function usePushNotificationContext() {
    const context = useContext(PushNotificationContext);
    if (!context) throw new Error("usePushNotificationContext must be used within PushNotificationProvider");
    return context;
}

export function PushNotificationProvider({ children }) {
    const { user, isAuthenticated } = useAuthContext();
    const { showNotification } = useNotificationContext();
    const [expoPushToken, setExpoPushToken] = useState(null);
    const [permissionGranted, setPermissionGranted] = useState(false);

    const foregroundSubRef = useRef(null);
    const responseSubRef = useRef(null);
    const tokenRef = useRef(null);

    // Handle tap on a notification (background / killed → foreground)
    const lastNotificationResponse = Notifications.useLastNotificationResponse();
    useEffect(() => {
        if (!lastNotificationResponse) return;
        const data = lastNotificationResponse.notification.request.content.data;
        routeNotificationTap(data);
    }, [lastNotificationResponse]);

    // Register token when user logs in
    const registerToken = useCallback(async () => {
        try {
            const token = await requestPermissionsAndGetToken();
            setPermissionGranted(!!token);
            if (!token) return;

            setExpoPushToken(token);
            tokenRef.current = token;
            await registerTokenWithBackend(token, user?.role);
        } catch {
            // Permissions denied or device error — not critical
        }
    }, [user?.role]);

    // Set up foreground notification + tap listeners
    const setupListeners = useCallback(() => {
        // Foreground: notification arrives while app is open → show an in-app toast
        foregroundSubRef.current = Notifications.addNotificationReceivedListener((notification) => {
            const { title, body } = notification.request.content;
            showNotification({
                title: title || "WorkPing",
                message: body || "",
                variant: "info",
                delay: 4000,
            });
        });

        // Tap: user taps notification in tray → navigate to correct screen
        responseSubRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            clearBadge();
            routeNotificationTap(data);
        });
    }, [showNotification]);

    const teardownListeners = useCallback(() => {
        if (foregroundSubRef.current) {
            foregroundSubRef.current.remove();
            foregroundSubRef.current = null;
        }
        if (responseSubRef.current) {
            responseSubRef.current.remove();
            responseSubRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        setCurrentRole(user.role);
        registerToken();
        setupListeners();
        preloadSounds(); // warm up audio engine so first play has no latency

        return () => {
            teardownListeners();
            unloadSounds();
            // Unregister token on logout (tokenRef carries the last known token)
            if (tokenRef.current) {
                unregisterTokenFromBackend(tokenRef.current, user.role);
                tokenRef.current = null;
                setExpoPushToken(null);
            }
        };
    }, [isAuthenticated, user?.role]);

    return (
        <PushNotificationContext.Provider value={{ expoPushToken, permissionGranted }}>
            {children}
        </PushNotificationContext.Provider>
    );
}
