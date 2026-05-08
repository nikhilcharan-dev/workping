import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image,
    Modal,
    Platform,
    Animated,
    Dimensions,
} from "react-native";
import { Camera, useCameraDevice, useCameraFormat } from "react-native-vision-camera";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import FaceGuideOverlay from "@/components/FaceGuideOverlay";
import { registerFace, getFaceStatus } from "@/services/faceApi";
import { compressFullPhoto } from "@/utils/imageProcessing";

const { width: SCREEN_W } = Dimensions.get("window");

const S = {
    IDLE: "idle",
    PREVIEW: "preview",
    UPLOADING: "uploading",
    SUCCESS: "success",
    ERROR: "error",
};

const FaceRegistrationScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef(null);

    const [state, setState] = useState(S.IDLE);
    const [capturedUri, setCapturedUri] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [hasPermission, setHasPermission] = useState(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    const device = useCameraDevice("front");
    const format = useCameraFormat(device, [{ videoResolution: { width: 1280, height: 720 } }, { fps: 30 }]);

    useEffect(() => {
        (async () => {
            const status = await Camera.getCameraPermissionStatus();
            if (status === "granted") {
                setHasPermission(true);
            } else {
                const result = await Camera.requestCameraPermission();
                setHasPermission(result === "granted");
            }
        })();
    }, []);

    useEffect(() => {
        getFaceStatus()
            .then(({ registered }) => {
                if (registered) setAlreadyRegistered(true);
            })
            .catch(() => {});
    }, []);

    const animateIn = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }),
        ]).start();
    }, [fadeAnim, scaleAnim]);

    useEffect(() => {
        if (state !== S.IDLE) animateIn();
    }, [state, animateIn]);

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const photo = await cameraRef.current.takePhoto({
                qualityPrioritization: "quality",
                flash: "off",
                enableShutterSound: false,
            });
            const uri = Platform.OS === "android" ? `file://${photo.path}` : photo.path;
            setCapturedUri(uri);
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.92);
            setState(S.PREVIEW);
        } catch (err) {
            setErrorMsg("Failed to capture photo. Please try again.");
            setState(S.ERROR);
        }
    }, [fadeAnim, scaleAnim]);

    const handleRetake = useCallback(() => {
        setCapturedUri(null);
        setErrorMsg("");
        setState(S.IDLE);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!capturedUri) return;
        setState(S.UPLOADING);
        try {
            const imageData = await compressFullPhoto(capturedUri);
            await registerFace(imageData);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.92);
            setState(S.SUCCESS);
        } catch (err) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                err?.message ||
                "Registration failed. Please try again.";
            setErrorMsg(msg);
            setState(S.ERROR);
        }
    }, [capturedUri, fadeAnim, scaleAnim]);

    const handleDone = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    // ── ALREADY REGISTERED MODAL ────────────────────────────────────────────────
    if (alreadyRegistered) {
        return (
            <Modal visible transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconRing}>
                            <Ionicons name="checkmark-circle" size={40} color="#00D4AA" />
                        </View>
                        <Text style={styles.modalTitle}>Already Registered</Text>
                        <Text style={styles.modalDesc}>
                            Your face is already registered in the system. You can use face recognition to mark
                            attendance.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    // ── PERMISSION GATE ──────────────────────────────────────────────────────────
    if (!hasPermission || !device) {
        return (
            <View style={styles.fullCenter}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <View style={styles.permIconWrap}>
                    <Ionicons name="camera-outline" size={40} color="#00D4AA" />
                </View>
                <Text style={styles.permTitle}>Camera Access Needed</Text>
                <Text style={styles.permDesc}>WorkPing needs camera access to capture your face for registration.</Text>
                <TouchableOpacity
                    style={styles.permBtn}
                    onPress={async () => {
                        const result = await Camera.requestCameraPermission();
                        setHasPermission(result === "granted");
                    }}
                >
                    <Text style={styles.permBtnText}>Allow Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── OVERLAY STATES ───────────────────────────────────────────────────────────
    const showOverlay = state !== S.IDLE;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Live camera (always mounted so preview is immediate) */}
            <Camera
                ref={cameraRef}
                device={device}
                format={format}
                isActive={state === S.IDLE}
                photo={true}
                pixelFormat="yuv"
                style={StyleSheet.absoluteFill}
                orientation="portrait"
            />
            <FaceGuideOverlay quality={state === S.IDLE ? "fair" : "good"} isCapturing={false} />

            {/* Top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Register Face</Text>
                <View style={styles.backBtn} />
            </View>

            {/* Hint text */}
            {state === S.IDLE && (
                <View style={styles.hintWrap}>
                    <Text style={styles.hintText}>Position your face in the oval, then tap capture</Text>
                </View>
            )}

            {/* ── PREVIEW OVERLAY ── */}
            {state === S.PREVIEW && (
                <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBase, { opacity: fadeAnim }]}>
                    {capturedUri && (
                        <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    )}
                    <View style={styles.overlayDim} />

                    <Animated.View style={[styles.overlayCard, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.previewThumbRing}>
                            {capturedUri && (
                                <Image source={{ uri: capturedUri }} style={styles.previewThumb} resizeMode="cover" />
                            )}
                        </View>
                        <Text style={styles.overlayTitle}>Use this photo?</Text>
                        <Text style={styles.overlayDesc}>Make sure your face is clearly visible and well-lit.</Text>
                        <View style={styles.btnRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake} activeOpacity={0.8}>
                                <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.secondaryBtnText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} activeOpacity={0.8}>
                                <Ionicons name="checkmark-outline" size={16} color="#000" />
                                <Text style={styles.primaryBtnText}>Register</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            )}

            {/* ── UPLOADING OVERLAY ── */}
            {state === S.UPLOADING && (
                <View style={[StyleSheet.absoluteFill, styles.overlayBase]}>
                    {capturedUri && (
                        <Image
                            source={{ uri: capturedUri }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            blurRadius={14}
                        />
                    )}
                    <View style={styles.overlayDim} />
                    <View style={styles.uploadingContent}>
                        <View style={styles.spinnerRing}>
                            <ActivityIndicator size="large" color="#00D4AA" />
                        </View>
                        <Text style={styles.overlayTitle}>Registering face…</Text>
                        <Text style={styles.overlayDesc}>Extracting and saving your face profile</Text>
                    </View>
                </View>
            )}

            {/* ── SUCCESS OVERLAY ── */}
            {state === S.SUCCESS && (
                <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBase, { opacity: fadeAnim }]}>
                    {capturedUri && (
                        <Image
                            source={{ uri: capturedUri }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            blurRadius={14}
                        />
                    )}
                    <View style={styles.overlayDim} />
                    <Animated.View style={[styles.overlayCard, { transform: [{ scale: scaleAnim }] }]}>
                        <View
                            style={[
                                styles.resultIconRing,
                                { borderColor: "#00D4AA", backgroundColor: "rgba(0,212,170,0.1)" },
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={44} color="#00D4AA" />
                        </View>
                        <View
                            style={[
                                styles.resultTag,
                                { backgroundColor: "rgba(0,212,170,0.1)", borderColor: "rgba(0,212,170,0.3)" },
                            ]}
                        >
                            <Ionicons name="checkmark-circle-outline" size={13} color="#00D4AA" />
                            <Text style={[styles.resultTagText, { color: "#00D4AA" }]}>Registration Complete</Text>
                        </View>
                        <Text style={styles.overlayTitle}>Face Registered!</Text>
                        <Text style={styles.overlayDesc}>
                            Your face has been saved. You can now use face recognition to mark attendance.
                        </Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.8}>
                            <Ionicons name="arrow-forward-outline" size={16} color="#000" />
                            <Text style={styles.primaryBtnText}>Done</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            )}

            {/* ── ERROR OVERLAY ── */}
            {state === S.ERROR && (
                <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBase, { opacity: fadeAnim }]}>
                    <View style={[styles.overlayDim, { backgroundColor: "rgba(4,6,18,0.92)" }]} />
                    <Animated.View style={[styles.overlayCard, { transform: [{ scale: scaleAnim }] }]}>
                        <View
                            style={[
                                styles.resultIconRing,
                                { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.08)" },
                            ]}
                        >
                            <Ionicons name="close-circle-outline" size={44} color="#EF4444" />
                        </View>
                        <View
                            style={[
                                styles.resultTag,
                                { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" },
                            ]}
                        >
                            <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                            <Text style={[styles.resultTagText, { color: "#EF4444" }]}>Registration Failed</Text>
                        </View>
                        <Text style={[styles.overlayTitle, { color: "#EF4444" }]}>Something went wrong</Text>
                        <Text style={styles.overlayDesc}>{errorMsg}</Text>
                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => navigation.goBack()}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.secondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: "rgba(239,68,68,0.85)" }]}
                                onPress={handleRetake}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="refresh-outline" size={16} color="#fff" />
                                <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            )}

            {/* Capture button (only in IDLE) */}
            {state === S.IDLE && (
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
                    <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
                        <View style={styles.captureBtnInner}>
                            <Ionicons name="camera-outline" size={30} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.captureHint}>Tap to capture your face</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    fullCenter: {
        flex: 1,
        backgroundColor: "#050812",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
        gap: 10,
    },
    permIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "rgba(0,212,170,0.08)",
        borderWidth: 1,
        borderColor: "rgba(0,212,170,0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    permTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
    },
    permDesc: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 14,
        textAlign: "center",
        lineHeight: 21,
    },
    permBtn: {
        backgroundColor: "#00D4AA",
        borderRadius: 14,
        paddingHorizontal: 32,
        paddingVertical: 13,
        marginTop: 8,
    },
    permBtnText: {
        color: "#000",
        fontSize: 15,
        fontWeight: "700",
    },
    backLink: {
        paddingVertical: 10,
        marginTop: 4,
    },
    backLinkText: {
        color: "rgba(255,255,255,0.35)",
        fontSize: 14,
    },

    topBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingBottom: 10,
        zIndex: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    screenTitle: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: 0.3,
    },

    hintWrap: {
        position: "absolute",
        bottom: 160,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 10,
    },
    hintText: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
        paddingHorizontal: 40,
        textShadowColor: "rgba(0,0,0,0.9)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        gap: 12,
        zIndex: 20,
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: "#00D4AA",
        padding: 5,
        alignItems: "center",
        justifyContent: "center",
    },
    captureBtnInner: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: "#00D4AA",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#00D4AA",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    captureHint: {
        color: "rgba(255,255,255,0.3)",
        fontSize: 11,
        fontWeight: "500",
        letterSpacing: 0.2,
    },

    overlayBase: {
        zIndex: 50,
        justifyContent: "center",
        alignItems: "center",
    },
    overlayDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(4,6,18,0.82)",
    },
    uploadingContent: {
        alignItems: "center",
        gap: 16,
    },
    spinnerRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(0,212,170,0.08)",
        borderWidth: 1,
        borderColor: "rgba(0,212,170,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },

    overlayCard: {
        width: SCREEN_W - 40,
        backgroundColor: "rgba(10,14,30,0.97)",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        padding: 28,
        alignItems: "center",
        gap: 10,
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },
    previewThumbRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2.5,
        borderColor: "#00D4AA",
        overflow: "hidden",
        marginBottom: 4,
    },
    previewThumb: {
        width: "100%",
        height: "100%",
    },
    resultIconRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    resultTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    resultTagText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    overlayTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginTop: 2,
    },
    overlayDesc: {
        color: "rgba(255,255,255,0.42)",
        fontSize: 13,
        textAlign: "center",
        lineHeight: 20,
    },

    btnRow: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
        marginTop: 6,
    },
    primaryBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#00D4AA",
        borderRadius: 14,
        paddingVertical: 13,
    },
    primaryBtnText: {
        color: "#000",
        fontSize: 15,
        fontWeight: "700",
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 14,
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    secondaryBtnText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 15,
        fontWeight: "600",
    },

    modalBg: {
        flex: 1,
        backgroundColor: "rgba(4,6,18,0.88)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 28,
    },
    modalCard: {
        width: "100%",
        backgroundColor: "rgba(10,14,30,0.98)",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(0,212,170,0.2)",
        padding: 28,
        alignItems: "center",
        gap: 12,
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },
    modalIconRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(0,212,170,0.08)",
        borderWidth: 1.5,
        borderColor: "rgba(0,212,170,0.3)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    modalTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
    },
    modalDesc: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 14,
        textAlign: "center",
        lineHeight: 21,
    },
    modalCloseBtn: {
        width: "100%",
        backgroundColor: "rgba(0,212,170,0.12)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(0,212,170,0.3)",
        paddingVertical: 13,
        alignItems: "center",
        marginTop: 4,
    },
    modalCloseBtnText: {
        color: "#00D4AA",
        fontSize: 15,
        fontWeight: "700",
    },
});

export default FaceRegistrationScreen;
