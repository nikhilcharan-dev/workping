import { createContext, useCallback, useContext, useMemo } from "react";
import Toast from "react-native-toast-message";

const NotificationContext = createContext(undefined);

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotificationContext must be used within NotificationProvider");
    }
    return context;
}

export function NotificationProvider({ children }) {
    const showNotification = useCallback(({ title, message, variant, delay = 2000 }) => {
        const typeMap = {
            success: "success",
            danger: "error",
            warning: "info",
            info: "info",
            primary: "info",
            light: "info",
            dark: "info",
        };

        Toast.show({
            type: typeMap[variant] || "info",
            text1: title || "",
            text2: message || "",
            visibilityTime: delay,
            position: "top",
        });
    }, []);

    const value = useMemo(() => ({ showNotification }), [showNotification]);

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
