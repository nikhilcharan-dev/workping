import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { getSession, setSession, clearSession } from "@/helpers/sessionStorage";

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
                const stored = await getSession();
                if (active && stored) {
                    setUser(stored);
                }
            } catch (e) {
                // Corrupted session data — clear it
                await clearSession();
            } finally {
                if (active) setIsLoading(false);
            }
        })();

        const subscription = DeviceEventEmitter.addListener("session_expired", () => {
            setUser(null);
            clearSession();
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
            await setSession(userData);
        } catch (e) {
            // Persist failed — session won't survive app restart
        }
    }, []);

    const removeSession = useCallback(async () => {
        setUser(null);
        await clearSession();
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
