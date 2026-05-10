import { useState, useCallback, useRef, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { useAuthContext } from "@/context/useAuthContext";
import { useNotificationContext } from "@/context/useNotificationContext";
import runtimeConfig from "@/helpers/runtimeConfig";

// RFC 7636 — PKCE helpers
async function generateCodeVerifier() {
    const bytes = await Crypto.getRandomBytesAsync(32);
    return base64urlEncode(bytes);
}

async function generateCodeChallenge(verifier) {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
        encoding: Crypto.CryptoEncoding.BASE64,
    });
    // Convert standard base64 → base64url
    return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlEncode(bytes) {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

const useOAuth = (role = "admin") => {
    const [loading, setLoading] = useState({ google: false, microsoft: false });
    const { saveSession } = useAuthContext();
    const { showNotification } = useNotificationContext();
    const isMountedRef = useRef(true);
    // Store verifier in ref so it survives the redirect round-trip within the same session
    const pkceVerifierRef = useRef(null);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleOAuthResult = useCallback(
        async (result) => {
            if (result.type !== "success" || !result.url) return false;

            try {
                const url = new URL(result.url);
                const code = url.searchParams.get("code");
                const token = url.searchParams.get("token");
                const error = url.searchParams.get("error");
                const oauthRole = url.searchParams.get("role");

                if (error) {
                    showNotification({ message: error, variant: "danger" });
                    return false;
                }

                // Server returns a short-lived code that must be exchanged with the verifier
                if (code && pkceVerifierRef.current) {
                    const exchangeRes = await fetch(`${runtimeConfig.getApiUrl()}/auth/pkce/exchange`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code, code_verifier: pkceVerifierRef.current }),
                    });
                    pkceVerifierRef.current = null;
                    if (!exchangeRes.ok) {
                        showNotification({ message: "OAuth token exchange failed", variant: "danger" });
                        return false;
                    }
                    const data = await exchangeRes.json();
                    if (data.token) {
                        saveSession({ token: data.token, role: data.role || role });
                        showNotification({ message: "Signed in successfully", variant: "success" });
                        return true;
                    }
                }

                // Fallback: server returned token directly (non-PKCE path)
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

    const startOAuth = useCallback(
        async (provider) => {
            const verifier = await generateCodeVerifier();
            const challenge = await generateCodeChallenge(verifier);
            pkceVerifierRef.current = verifier;

            const url =
                `${runtimeConfig.getApiUrl()}/auth/${provider}/start` +
                `?platform=mobile&code_challenge=${challenge}&code_challenge_method=S256`;

            const result = await WebBrowser.openAuthSessionAsync(url, "workping://auth");
            await handleOAuthResult(result);
        },
        [handleOAuthResult]
    );

    const handleGoogleSignIn = useCallback(async () => {
        setLoading((prev) => ({ ...prev, google: true }));
        try {
            await startOAuth("google");
        } catch {
            showNotification({ message: "Google sign in failed", variant: "danger" });
        } finally {
            if (isMountedRef.current) setLoading((prev) => ({ ...prev, google: false }));
        }
    }, [startOAuth, showNotification]);

    const handleMicrosoftSignIn = useCallback(async () => {
        setLoading((prev) => ({ ...prev, microsoft: true }));
        try {
            await startOAuth("microsoft");
        } catch {
            showNotification({ message: "Microsoft sign in failed", variant: "danger" });
        } finally {
            if (isMountedRef.current) setLoading((prev) => ({ ...prev, microsoft: false }));
        }
    }, [startOAuth, showNotification]);

    return { loading, handleGoogleSignIn, handleMicrosoftSignIn };
};

export default useOAuth;
