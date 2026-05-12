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
    // Store verifier + state in refs so they survive the redirect round-trip
    // within the same session. State binds the redirect back to this exact
    // OAuth attempt — without it, an attacker who can deliver `workping://auth`
    // deep links could plant a chosen token in the URL and log the user in
    // as someone they control.
    const pkceVerifierRef = useRef(null);
    const stateRef = useRef(null);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleOAuthResult = useCallback(
        async (result, initiatedProvider) => {
            if (result.type !== "success" || !result.url) return false;

            // Capture refs once and immediately null them so any second
            // redirect (e.g. from an attacker-crafted deep link arriving later)
            // cannot reuse the same verifier/state.
            const expectedState = stateRef.current;
            const verifier = pkceVerifierRef.current;
            stateRef.current = null;
            pkceVerifierRef.current = null;

            if (!expectedState) {
                showNotification({ message: "No active OAuth session", variant: "danger" });
                return false;
            }

            try {
                const url = new URL(result.url);
                const code = url.searchParams.get("code");
                const token = url.searchParams.get("token");
                const error = url.searchParams.get("error");
                const oauthRole = url.searchParams.get("role");
                const receivedState = url.searchParams.get("state");
                // Server echoes provider so the exchange can route correctly
                // even if the start-side ref were ever lost.
                const redirectProvider = url.searchParams.get("provider") || initiatedProvider;

                if (error) {
                    showNotification({ message: error, variant: "danger" });
                    return false;
                }

                // Bind the redirect to this exact OAuth attempt. Reject any
                // response that doesn't echo the state we sent.
                if (receivedState !== expectedState) {
                    showNotification({ message: "OAuth state mismatch — possible CSRF", variant: "danger" });
                    return false;
                }

                // Server returns a short-lived code that must be exchanged with the verifier
                if (code && verifier && redirectProvider) {
                    const exchangeRes = await fetch(
                        `${runtimeConfig.getApiUrl()}/auth/${redirectProvider}/pkce/exchange`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ code, code_verifier: verifier }),
                        }
                    );
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

                // Fallback non-PKCE path: only honored when state already matched.
                // The token-in-URL pattern is still less safe than the code+verifier
                // exchange, but the state binding closes the deep-link forgery path.
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
            // 16 bytes of randomness = 128 bits — way past any feasible guess.
            const stateBytes = await Crypto.getRandomBytesAsync(16);
            const state = base64urlEncode(stateBytes);
            pkceVerifierRef.current = verifier;
            stateRef.current = state;

            const url =
                `${runtimeConfig.getApiUrl()}/auth/${provider}/start` +
                `?platform=mobile&code_challenge=${challenge}&code_challenge_method=S256&state=${encodeURIComponent(state)}`;

            const result = await WebBrowser.openAuthSessionAsync(url, "workping://auth");
            await handleOAuthResult(result, provider);
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
