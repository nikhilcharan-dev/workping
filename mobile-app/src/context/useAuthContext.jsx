import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { AUTH_STORAGE_KEY } from "./constants";

const AuthContext = createContext(undefined);

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
                if (active && stored) {
                    setUser(JSON.parse(stored));
                }
            } catch (e) {
                // Corrupted session data — clear it
                await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
            } finally {
                if (active) setIsLoading(false);
            }
        })();

        const subscription = DeviceEventEmitter.addListener("session_expired", () => {
            setUser(null);
            AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
        });

        return () => {
            active = false;
            subscription.remove();
        };
    }, []);

    const saveSession = useCallback(async (userData) => {
        if (!userData) return;
        setUser(userData);
        try {
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        } catch (e) {
            // Persist failed — session won't survive app restart
        }
    }, []);

    const removeSession = useCallback(async () => {
        // Always clear in-memory state, even if AsyncStorage removal fails
        setUser(null);
        try {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (e) {
            // Remove failed — in-memory state already cleared
        }
    }, []);

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: !!user,
            isLoading,
            saveSession,
            removeSession,
        }),
        [user, isLoading, saveSession, removeSession]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
