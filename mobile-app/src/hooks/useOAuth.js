import { useState, useCallback, useRef, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import { useAuthContext } from "@/context/useAuthContext";
import { useNotificationContext } from "@/context/useNotificationContext";
import runtimeConfig from "@/helpers/runtimeConfig";

const useOAuth = (role = "admin") => {
    const [loading, setLoading] = useState({ google: false, microsoft: false });
    const { saveSession } = useAuthContext();
    const { showNotification } = useNotificationContext();
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleOAuthResult = useCallback(
        (result) => {
            if (result.type !== "success" || !result.url) return false;

            try {
                const url = new URL(result.url);
                const token = url.searchParams.get("token");
                const error = url.searchParams.get("error");
                const oauthRole = url.searchParams.get("role");

                if (error) {
                    showNotification({ message: error, variant: "danger" });
                    return false;
                }

                if (token) {
                    saveSession({ token, role: oauthRole || role });
                    showNotification({ message: "Signed in successfully", variant: "success" });
                    return true;
                }
            } catch {
                showNotification({ message: "Invalid redirect from server", variant: "danger" });
                return false;
            }

            return false;
        },
        [saveSession, showNotification, role]
    );

    const handleGoogleSignIn = useCallback(async () => {
        setLoading((prev) => ({ ...prev, google: true }));
        try {
            const result = await WebBrowser.openAuthSessionAsync(
                `${runtimeConfig.getApiUrl()}/auth/google/start?platform=mobile`,
                "workping://auth"
            );
            handleOAuthResult(result);
        } catch (e) {
            showNotification({ message: "Google sign in failed", variant: "danger" });
        } finally {
            if (isMountedRef.current) {
                setLoading((prev) => ({ ...prev, google: false }));
            }
        }
    }, [handleOAuthResult, showNotification]);

    const handleMicrosoftSignIn = useCallback(async () => {
        setLoading((prev) => ({ ...prev, microsoft: true }));
        try {
            const result = await WebBrowser.openAuthSessionAsync(
                `${runtimeConfig.getApiUrl()}/auth/microsoft/start?platform=mobile`,
                "workping://auth"
            );
            handleOAuthResult(result);
        } catch (e) {
            showNotification({ message: "Microsoft sign in failed", variant: "danger" });
        } finally {
            if (isMountedRef.current) {
                setLoading((prev) => ({ ...prev, microsoft: false }));
            }
        }
    }, [handleOAuthResult, showNotification]);

    return { loading, handleGoogleSignIn, handleMicrosoftSignIn };
};

export default useOAuth;
