/**
 * useFaceCapture — orchestration hook for the face capture pipeline.
 *
 * State machine: idle → detecting → ready → capturing → processing → success|unknown|error → idle
 *
 * Wires together:
 *   - faceValidation.js (on-device quality checks + liveness)
 *   - imageProcessing.js (crop + compress via expo-image-manipulator)
 *   - faceApi.js (POST /api/v1/detect with retries)
 *
 * The screen only reads state and calls actions — all logic lives here.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { AppState, Platform } from "react-native";
import { Camera } from "react-native-vision-camera";
import * as Haptics from "expo-haptics";
import { playSuccess, playRetry, playError } from "@/services/soundService";

import { validateFace, checkFaceCount, livenessCheck, THRESHOLDS } from "@/utils/faceValidation";
import { cropFace, compressFullPhoto } from "@/utils/imageProcessing";
import { detect, healthCheck, verifyLocation } from "@/services/faceApi";
import { offlineQueueReady, enqueue as enqueueOffline, persistImageForQueue } from "@/services/offlineQueue";
import useLocationLock from "@/hooks/useLocationLock";

const ATTENDANCE_ENDPOINT = "/api/user/attendance/verify-mark-attendance";

// --- CONFIG ---
const CONFIG = {
    AUTO_CAPTURE_DELAY_MS: 800, // face must be centered for 0.8s
    RESULT_DISPLAY_MS: 6000, // show result card for 6s
    COOLDOWN_MS: 2000, // min gap between captures
    MAX_CAPTURES_PER_MINUTE: 20,
    HEALTH_CHECK_INTERVAL_MS: 30000,
    DETECTION_THROTTLE_MS: 40, // ~25fps max JS callbacks
};

// --- STATES ---
const S = {
    IDLE: "idle",
    DETECTING: "detecting",
    READY: "ready",
    CAPTURING: "capturing",
    PROCESSING: "processing",
    QUEUED: "queued",
    SUCCESS: "success",
    UNKNOWN: "unknown", // face not in database — shows result card
    ERROR: "error", // network/server/timeout failure
    VERIFYING_REGION: "verifying_region",
};

const STATUS_TEXT = {
    [S.IDLE]: "Position your face in the oval",
    [S.DETECTING]: null, // set dynamically from validation.issues[0]
    [S.READY]: "Face detected — capturing...",
    [S.CAPTURING]: "Capturing...",
    [S.PROCESSING]: "Recognizing...",
    [S.QUEUED]: "Waiting in queue...", // Overridden below
    [S.SUCCESS]: null, // set dynamically from result.person.name
    [S.UNKNOWN]: "Face not recognized",
    [S.ERROR]: null, // set dynamically from errorMsg
};

const STATUS_COLORS = {
    [S.IDLE]: "#7B8FA3",
    [S.DETECTING]: "#F59E0B",
    [S.READY]: "#00D4AA",
    [S.CAPTURING]: "#0EA5E9",
    [S.PROCESSING]: "#0EA5E9",
    [S.QUEUED]: "#8B5CF6",
    [S.SUCCESS]: "#10B981",
    [S.UNKNOWN]: "#F59E0B",
    [S.ERROR]: "#FF6B6B",
};

export default function useFaceCapture() {
    const cameraRef = useRef(null);
    const locationLock = useLocationLock();
    const { collectSnapshot } = locationLock;

    // --- REACTIVE STATE ---
    const [state, setState] = useState(S.IDLE);
    const [capturedImage, setCapturedImage] = useState(null);
    const [validation, setValidation] = useState({ isValid: false, quality: "poor", issues: [], scores: {} });
    const [liveness, setLiveness] = useState({ isLive: false, reason: null, signals: {} });
    const [result, setResult] = useState(null);
    const [latencyMs, setLatencyMs] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [queuePosition, setQueuePosition] = useState(null);
    const [serverStatus, setServerStatus] = useState("unknown");
    const [hasPermission, setHasPermission] = useState(false);
    const [locationLockState, setLocationLockState] = useState("idle"); // idle | valid | invalid
    const [isCameraActive, setIsCameraActive] = useState(true);

    // --- INTERNAL REFS ---
    const isMountedRef = useRef(true);
    const faceHistoryRef = useRef([]); // rolling buffer for liveness
    const lastDetectionRef = useRef(0);
    const validSinceRef = useRef(null);
    const autoCaptureRef = useRef(null);
    const resultTimerRef = useRef(null);
    const healthTimerRef = useRef(null);
    const captureCountRef = useRef(0);
    const captureCountResetRef = useRef(null);
    const lastCaptureRef = useRef(0);
    const lastFrameSizeRef = useRef({ width: 640, height: 480 });
    const lastFaceBoundsRef = useRef(null);
    const appActiveRef = useRef(true);
    const stateRef = useRef(state); // non-reactive mirror for callbacks
    const triggerCaptureRef = useRef(null);
    const processingTimeoutRef = useRef(null);

    // Keep stateRef in sync
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Track mount lifecycle
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Safe setState — no-op after unmount
    const safeSetState = useCallback((setter, value) => {
        if (isMountedRef.current) setter(value);
    }, []);

    // --- PERMISSION ---
    useEffect(() => {
        (async () => {
            const status = await Camera.getCameraPermissionStatus();
            setHasPermission(status === "granted");
        })();
    }, []);

    const requestPermission = useCallback(async () => {
        const status = await Camera.requestCameraPermission();
        const granted = status === "granted";
        setHasPermission(granted);
        return granted;
    }, []);

    // --- 3D LOCATION LOCK CHECK ---
    // Geofence is a security boundary, not a UX nicety: a missing snapshot or a
    // failed verify call must NOT grant attendance. Both paths set the lock to
    // "invalid" so the capture screen surfaces an error instead of silently
    // letting a user mark attendance from anywhere on Earth.
    const checkLocationRegion = useCallback(async () => {
        if (!isMountedRef.current) return;

        safeSetState(setState, S.VERIFYING_REGION);
        try {
            // Collect GPS + WiFi snapshot (no public IP — server reads that from the request)
            const snapshot = await collectSnapshot();

            if (!snapshot || snapshot.status === "unavailable") {
                safeSetState(setLocationLockState, "invalid");
                safeSetState(
                    setErrorMsg,
                    "Could not verify your location. Enable GPS and try again."
                );
                safeSetState(setState, S.ERROR);
                return;
            }

            const res = await verifyLocation(snapshot);

            if (res?.allowed) {
                safeSetState(setLocationLockState, "valid");
                safeSetState(setState, S.IDLE);
            } else {
                safeSetState(setLocationLockState, "invalid");
                safeSetState(setErrorMsg, res?.message || "Invalid location for attendance");
                safeSetState(setState, S.ERROR);
            }
        } catch (err) {
            safeSetState(setLocationLockState, "invalid");
            safeSetState(
                setErrorMsg,
                err?.message
                    ? `Location check failed: ${err.message}`
                    : "Location check failed. Try again or contact your admin."
            );
            safeSetState(setState, S.ERROR);
        }
    }, [collectSnapshot, safeSetState]);

    useEffect(() => {
        checkLocationRegion();
    }, [checkLocationRegion]);

    // --- HEALTH CHECK ---
    // Declared before the AppState useEffect that depends on it
    const healthCheckFn = useCallback(async () => {
        if (!isMountedRef.current) return;
        try {
            const h = await healthCheck();
            safeSetState(setServerStatus, h.status || "ok");
        } catch {
            safeSetState(setServerStatus, "down");
        }
    }, [safeSetState]);

    // --- APP STATE (pause camera + health check in background) ---
    useEffect(() => {
        const sub = AppState.addEventListener("change", (next) => {
            const active = next === "active";
            appActiveRef.current = active;
            setIsCameraActive(active);

            if (active) {
                if (!healthTimerRef.current) {
                    healthCheckFn();
                    healthTimerRef.current = setInterval(() => healthCheckFn(), CONFIG.HEALTH_CHECK_INTERVAL_MS);
                }
            } else {
                if (healthTimerRef.current) {
                    clearInterval(healthTimerRef.current);
                    healthTimerRef.current = null;
                }
            }
        });
        return () => sub.remove();
    }, [healthCheckFn]);

    useEffect(() => {
        healthCheckFn();
        healthTimerRef.current = setInterval(healthCheckFn, CONFIG.HEALTH_CHECK_INTERVAL_MS);
        return () => {
            clearInterval(healthTimerRef.current);
            healthTimerRef.current = null;
        };
    }, [healthCheckFn]);

    // --- RATE LIMIT RESET ---
    useEffect(() => {
        captureCountResetRef.current = setInterval(() => {
            captureCountRef.current = 0;
        }, 60000);
        return () => clearInterval(captureCountResetRef.current);
    }, []);

    // --- CLEANUP ---
    useEffect(() => {
        return () => {
            clearTimeout(autoCaptureRef.current);
            clearTimeout(resultTimerRef.current);
            clearTimeout(processingTimeoutRef.current);
        };
    }, []);

    // --- FRAME PROCESSOR CALLBACK ---
    // Called from the screen's Worklets.createRunOnJS bridge
    const onFacesDetected = useCallback((detectedFaces, frameSize) => {
        // Throttle
        const now = Date.now();
        if (now - lastDetectionRef.current < CONFIG.DETECTION_THROTTLE_MS) return;
        lastDetectionRef.current = now;

        // Don't process during result display
        const s = stateRef.current;
        if (s === S.CAPTURING || s === S.PROCESSING || s === S.SUCCESS || s === S.UNKNOWN || s === S.ERROR) return;

        lastFrameSizeRef.current = frameSize;

        // --- Check count ---
        const countResult = checkFaceCount(detectedFaces);
        if (!countResult.ok) {
            setValidation({ isValid: false, quality: "poor", issues: [countResult.issue], scores: {} });
            setLiveness({ isLive: false, reason: null, signals: {} });
            faceHistoryRef.current = [];
            validSinceRef.current = null;
            clearTimeout(autoCaptureRef.current);
            if (s !== S.IDLE) setState(S.IDLE);
            return;
        }

        const face = detectedFaces[0];
        lastFaceBoundsRef.current = face.bounds;

        // --- Validate ---
        const v = validateFace(face, frameSize);
        setValidation(v);

        // --- Liveness buffer ---
        faceHistoryRef.current.push(face);
        if (faceHistoryRef.current.length > THRESHOLDS.LIVENESS_BUFFER_SIZE) {
            faceHistoryRef.current.shift();
        }
        const live = livenessCheck(faceHistoryRef.current);
        setLiveness(live);

        // --- State transitions ---
        if (!v.isValid) {
            validSinceRef.current = null;
            clearTimeout(autoCaptureRef.current);
            if (s === S.IDLE || s === S.READY) {
                setState(S.DETECTING);
            }
            return;
        }

        // Face is valid — need liveness too
        if (!live.isLive) {
            setState(S.DETECTING);
            return;
        }

        // Face is valid AND live
        if (s !== S.READY) {
            setState(S.READY);
        }

        // Track how long face has been valid+live
        if (!validSinceRef.current) {
            validSinceRef.current = now;
        }

        // Auto-capture if valid+live for CONFIG.AUTO_CAPTURE_DELAY_MS
        const validFor = now - validSinceRef.current;
        if (validFor >= CONFIG.AUTO_CAPTURE_DELAY_MS) {
            validSinceRef.current = null;
            triggerCaptureRef.current?.();
        }
    }, []);

    // --- RESET ---
    // Declared before triggerCapture so it can be in its dependency array
    const safeResetState = useCallback(() => {
        if (!isMountedRef.current) return;
        setState(S.IDLE);
        setResult(null);
        setCapturedImage(null);
        setErrorMsg("");
        setQueuePosition(null);
        setLatencyMs(0);
        setValidation({ isValid: false, quality: "poor", issues: [], scores: {} });
        setLiveness({ isLive: false, reason: null, signals: {} });
        faceHistoryRef.current = [];
        lastFaceBoundsRef.current = null;
        validSinceRef.current = null;
        clearTimeout(autoCaptureRef.current);
        clearTimeout(processingTimeoutRef.current);
    }, []);

    // --- CAPTURE ---
    const triggerCapture = useCallback(async () => {
        const s = stateRef.current;
        if (s === S.CAPTURING || s === S.PROCESSING || s === S.QUEUED) return;

        // Cooldown
        const now = Date.now();
        if (now - lastCaptureRef.current < CONFIG.COOLDOWN_MS) return;

        // Rate limit
        if (captureCountRef.current >= CONFIG.MAX_CAPTURES_PER_MINUTE) {
            safeSetState(setErrorMsg, "Too many attempts, wait a moment");
            safeSetState(setState, S.ERROR);
            resultTimerRef.current = setTimeout(safeResetState, 3000);
            return;
        }

        safeSetState(setState, S.CAPTURING);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        lastCaptureRef.current = now;
        captureCountRef.current += 1;

        // Processing timeout — auto-error if pipeline takes >15s
        processingTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            const cur = stateRef.current;
            if (cur === S.CAPTURING || cur === S.PROCESSING) {
                safeSetState(setErrorMsg, "Request timed out");
                safeSetState(setState, S.ERROR);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                resultTimerRef.current = setTimeout(safeResetState, 3000);
            }
        }, 15000);

        const startTime = Date.now();
        console.log("[Capture] ── pipeline start ──────────────────────");

        // Hoisted so the catch block can enqueue the cropped image + meta if
        // the server call fails with no response (network/timeout).
        let imageData = null;
        let locationSnapshot = null;
        const deviceId = `workping-${Platform.OS}-${Platform.Version}`;
        const captureTimestamp = new Date().toISOString();

        try {
            // 1. Take photo
            console.log("[Capture] 1. takePhoto start");
            if (!cameraRef.current) throw new Error("Camera not available");
            const photo = await cameraRef.current.takePhoto({
                qualityPrioritization: "speed",
                flash: "off",
                enableShutterSound: false,
            });
            if (!photo) throw new Error("Capture failed");
            if (!isMountedRef.current) return;
            console.log(
                "[Capture] 1. takePhoto OK — size:",
                photo.width,
                "x",
                photo.height,
                "path:",
                photo.path?.slice(-40)
            );

            const photoUri = Platform.OS === "android" ? `file://${photo.path}` : photo.path;
            safeSetState(setState, S.PROCESSING);
            safeSetState(setCapturedImage, photoUri);

            // 2. Crop face + collect location IN PARALLEL
            const faceBounds = lastFaceBoundsRef.current;
            const frameSize = lastFrameSizeRef.current;
            const photoSize = { width: photo.width, height: photo.height };
            console.log(
                "[Capture] 2. imageProcessing start — faceBounds:",
                !!faceBounds,
                "frameSize:",
                frameSize,
                "photoSize:",
                photoSize
            );

            const cropPromise =
                faceBounds && frameSize
                    ? cropFace(photoUri, faceBounds, frameSize, photoSize)
                    : compressFullPhoto(photoUri);

            const locationPromise = collectSnapshot().catch((e) => {
                console.warn("[Capture] 2. collectSnapshot error (non-fatal):", e?.message);
                return null;
            });

            [imageData, locationSnapshot] = await Promise.all([cropPromise, locationPromise]);
            if (!isMountedRef.current) return;
            console.log(
                "[Capture] 2. imageProcessing OK — uri:",
                imageData?.uri?.slice(-40),
                "base64 len:",
                imageData?.base64?.length
            );
            console.log(
                "[Capture] 2. locationSnapshot:",
                locationSnapshot ? JSON.stringify(locationSnapshot).slice(0, 120) : "null"
            );

            // 3. Send to server
            console.log("[Capture] 3. detect() → POST verify-mark-attendance");
            const res = await detect(
                imageData,
                {
                    deviceId,
                    locationId: "main-entrance",
                    timestamp: captureTimestamp,
                    locationLock: locationSnapshot,
                },
                (progress) => {
                    console.log("[Capture] 3. queue progress:", progress);
                    if (progress.status === "queued") {
                        safeSetState(setQueuePosition, progress.position);
                        safeSetState(setState, S.QUEUED);
                    }
                }
            );

            if (!isMountedRef.current) return;
            clearTimeout(processingTimeoutRef.current);

            const totalLatency = Date.now() - startTime;
            console.log("[Capture] 3. detect() OK — latency:", totalLatency, "ms — success:", res.success);
            safeSetState(setLatencyMs, totalLatency);
            safeSetState(setResult, res);

            // 4. Result state
            if (res.success) {
                safeSetState(setState, S.SUCCESS);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                playSuccess();
                // No auto-dismiss for success — user taps "View Attendance" to proceed
            } else {
                safeSetState(setState, S.UNKNOWN);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                playRetry();
                resultTimerRef.current = setTimeout(safeResetState, CONFIG.RESULT_DISPLAY_MS);
            }
        } catch (err) {
            clearTimeout(processingTimeoutRef.current);
            if (!isMountedRef.current) return;

            console.error("[Capture] PIPELINE ERROR:", err?.message);
            console.error("[Capture]   response status :", err?.response?.status);
            console.error("[Capture]   response data   :", JSON.stringify(err?.response?.data));
            console.error("[Capture]   err.code        :", err?.code);
            console.error("[Capture]   stack           :", err?.stack?.split("\n").slice(0, 4).join(" | "));

            // Network/timeout failure with an image already cropped → queue
            // for replay on reconnect. `!err.response` distinguishes transport
            // failures from server errors (400/500), which should still surface
            // to the user instead of being silently queued.
            const isTransportFailure = !err.response;
            if (isTransportFailure && imageData?.uri) {
                try {
                    const ready = await offlineQueueReady;
                    if (ready) {
                        // Copy out of expo-image-manipulator's cache (which the OS
                        // can purge) into the app's documents directory so the
                        // image is guaranteed to exist at flush time.
                        const persistedUri = await persistImageForQueue(imageData.uri);
                        await enqueueOffline({
                            kind: "attendance",
                            endpoint: ATTENDANCE_ENDPOINT,
                            payload: {
                                imageUri: persistedUri,
                                meta: {
                                    deviceId,
                                    locationId: "main-entrance",
                                    timestamp: captureTimestamp,
                                    locationLock: locationSnapshot,
                                },
                            },
                        });
                        if (!isMountedRef.current) return;
                        safeSetState(setErrorMsg, "No connection — saved offline. Will sync automatically.");
                        safeSetState(setState, S.ERROR);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        resultTimerRef.current = setTimeout(safeResetState, 3000);
                        return;
                    }
                } catch (qerr) {
                    console.error("[Capture] enqueue failed:", qerr?.message);
                    // Fall through to the normal error display below.
                }
            }

            const msg = err.response?.data?.message || err.response?.data?.detail || err.message || "Connection error";
            safeSetState(setErrorMsg, msg);
            safeSetState(setState, S.ERROR);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            playError();
            resultTimerRef.current = setTimeout(safeResetState, 3000);
        }
    }, [safeSetState, safeResetState]);

    // Keep ref in sync for onFacesDetected
    useEffect(() => {
        triggerCaptureRef.current = triggerCapture;
    }, [triggerCapture]);

    // --- MANUAL CAPTURE (button press) ---
    const manualCapture = useCallback(() => {
        triggerCapture();
    }, [triggerCapture]);

    // --- DISMISS RESULT ---
    const dismissResult = useCallback(() => {
        clearTimeout(resultTimerRef.current);
        resultTimerRef.current = null;
        safeResetState();
    }, [safeResetState]);

    // --- DERIVED ---
    const statusText = (() => {
        if (state === S.DETECTING) {
            return validation.issues[0] || liveness.reason || "Adjusting...";
        }
        if (state === S.SUCCESS) {
            return `Welcome, ${result?.person?.name || "User"}!`;
        }
        if (state === S.QUEUED) {
            if (queuePosition !== null && queuePosition > 0) return `Received! You are #${queuePosition} in line...`;
            return "Waiting in server queue...";
        }
        if (state === S.ERROR) {
            return errorMsg || "Something went wrong";
        }
        return STATUS_TEXT[state] || "";
    })();

    const statusColor = STATUS_COLORS[state] || STATUS_COLORS[S.IDLE];
    const isProcessing = state === S.CAPTURING || state === S.PROCESSING || state === S.QUEUED;
    // Camera must stay active through CAPTURING so takePhoto() has a live feed.
    // It freezes naturally when state moves to PROCESSING (after photo is taken).
    const cameraActive =
        isCameraActive && (state === S.IDLE || state === S.DETECTING || state === S.READY || state === S.CAPTURING);

    return {
        // Refs
        cameraRef,

        // State
        state,
        capturedImage,
        validation,
        liveness,
        result,
        latencyMs,
        errorMsg,
        queuePosition,
        serverStatus,
        hasPermission,
        locationLockState, // exported so screen can gate the capture button

        // Location
        locationPermission: locationLock.permissionStatus,
        locationGranted: locationLock.isGranted,
        requestLocationPermission: locationLock.requestPermissions,
        lastLocationSnapshot: locationLock.lastSnapshot,

        // Derived
        statusText,
        statusColor,
        isProcessing,
        isCameraActive: cameraActive,

        // Actions
        requestPermission,
        onFacesDetected,
        manualCapture,
        dismissResult,
    };
}

export { S as CAPTURE_STATES, STATUS_COLORS };
