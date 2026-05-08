/**
 * FaceCaptureScreen — face recognition attendance screen.
 */

import React, { useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    ActivityIndicator,
    TouchableOpacity,
    StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Camera, useCameraDevice, useCameraFormat, useFrameProcessor } from "react-native-vision-camera";
import { useFaceDetector } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";
import Button from "@/components/Button";
import FaceGuideOverlay from "@/components/FaceGuideOverlay";
import FaceCaptureResultCard from "@/components/FaceCaptureResultCard";
import useFaceCapture, { CAPTURE_STATES as S } from "@/hooks/useFaceCapture";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const FaceCaptureScreen = () => {
    const { colors } = useTheme();
    const capture = useFaceCapture();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const handleGoToAttendance = useCallback(() => {
        capture.dismissResult();
        navigation.navigate("Main", { screen: "Attendance" });
    }, [capture, navigation]);

    const handleRegisterFace = useCallback(() => {
        capture.dismissResult();
        navigation.navigate("FaceRegistration");
    }, [capture, navigation]);

    const device = useCameraDevice("front");
    const format = useCameraFormat(device, [{ videoResolution: { width: 1280, height: 720 } }, { fps: 30 }]);

    const { detectFaces } = useFaceDetector({
        performanceMode: "fast",
        landmarkMode: "none",
        contourMode: "none",
        classificationMode: "all",
        minFaceSize: 0.2,
        trackingEnabled: true,
    });

    const jsCallback = Worklets.createRunOnJS((faces, frame) => {
        capture.onFacesDetected(faces, frame);
    });

    const frameProcessor = useFrameProcessor(
        (frame) => {
            "worklet";
            const faces = detectFaces(frame);
            jsCallback(faces, { width: frame.width, height: frame.height });
        },
        [jsCallback]
    );

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const statusOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (capture.state === S.READY) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
        pulseAnim.setValue(1);
    }, [capture.state]);

    useEffect(() => {
        Animated.sequence([
            Animated.timing(statusOpacity, { toValue: 0, duration: 60, useNativeDriver: true }),
            Animated.timing(statusOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        ]).start();
    }, [capture.statusText]);

    const faceQuality =
        capture.state === S.READY || capture.state === S.SUCCESS
            ? "good"
            : capture.state === S.CAPTURING || capture.state === S.PROCESSING
              ? "fair"
              : "poor";

    // ── PERMISSION / NO DEVICE ──────────────────────────────────────────────────
    if (!capture.hasPermission || !device) {
        return (
            <View style={[styles.permScreen, { backgroundColor: colors.bodyBg, paddingTop: insets.top }]}>
                <View style={styles.permIconWrap}>
                    <Ionicons name="camera" size={44} color="#00D4AA" />
                </View>
                <Text style={[styles.permTitle, { color: colors.textPrimary }]}>Camera Access Needed</Text>
                <Text style={styles.permDesc}>
                    WorkPing needs camera access to verify your identity for attendance.
                </Text>
                <Button title="Allow Camera" onPress={capture.requestPermission} style={styles.permBtn} />
            </View>
        );
    }

    // ── OVAL BOTTOM EDGE Y ──────────────────────────────────────────────────────
    const OVAL_H = SCREEN_W * 0.58 * 1.35;
    const ovalBottomY = SCREEN_H * 0.45 + OVAL_H / 2;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── CAMERA ── */}
            <View style={StyleSheet.absoluteFill}>
                <Camera
                    ref={capture.cameraRef}
                    device={device}
                    format={format}
                    isActive={capture.isCameraActive}
                    frameProcessor={frameProcessor}
                    photo={true}
                    pixelFormat="yuv"
                    style={StyleSheet.absoluteFill}
                    orientation="portrait"
                />

                <FaceGuideOverlay quality={faceQuality} isCapturing={capture.state === S.CAPTURING} />

                {/* Processing overlay */}
                {capture.state === S.PROCESSING && (
                    <View style={styles.overlay}>
                        {capture.capturedImage ? (
                            <Animated.Image
                                source={{ uri: capture.capturedImage }}
                                style={styles.capturedPreview}
                                resizeMode="cover"
                            />
                        ) : (
                            <ActivityIndicator size="large" color="#00D4AA" />
                        )}
                        <Text style={styles.overlayTitle}>Verifying identity…</Text>
                        <Text style={styles.overlaySubText}>Please hold still</Text>
                    </View>
                )}

                {/* Location verification overlay */}
                {capture.state === S.VERIFYING_REGION && (
                    <View style={styles.overlay}>
                        <View style={styles.overlayIconRing}>
                            <Ionicons name="location" size={30} color="#00D4AA" />
                        </View>
                        <Text style={styles.overlayTitle}>Checking location…</Text>
                        <Text style={styles.overlaySubText}>This only takes a moment</Text>
                    </View>
                )}
            </View>

            {/* ── TOP BAR ── */}
            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                <View style={styles.topBadge}>
                    <View
                        style={[
                            styles.statusDot,
                            {
                                backgroundColor: capture.serverStatus === "ok" ? "#10B981" : "#FF6B6B",
                            },
                        ]}
                    />
                    <Text style={styles.topBadgeText}>{capture.serverStatus === "ok" ? "Online" : "Offline"}</Text>
                </View>

                <Text style={styles.appLabel}>Attendance</Text>

                <View style={styles.topBadge}>
                    <Ionicons
                        name={capture.locationGranted ? "location" : "location-outline"}
                        size={12}
                        color={capture.locationGranted ? "#00D4AA" : "rgba(255,255,255,0.35)"}
                    />
                    <Text
                        style={[
                            styles.topBadgeText,
                            {
                                color: capture.locationGranted ? "#00D4AA" : "rgba(255,255,255,0.35)",
                            },
                        ]}
                    >
                        {capture.locationGranted ? "Located" : "No GPS"}
                    </Text>
                </View>
            </View>

            {/* ── STATUS TEXT — below the oval ── */}
            <View style={[styles.statusArea, { top: ovalBottomY + 14 }]}>
                <Animated.Text
                    style={[styles.statusText, { color: capture.statusColor, opacity: statusOpacity }]}
                    numberOfLines={2}
                >
                    {capture.statusText}
                </Animated.Text>
            </View>

            {/* ── RESULT CARD ── */}
            {(capture.state === S.SUCCESS ||
                capture.state === S.UNKNOWN ||
                capture.state === S.ERROR ||
                capture.state === S.QUEUED) && (
                <FaceCaptureResultCard
                    state={capture.state}
                    result={capture.result}
                    errorMsg={capture.errorMsg}
                    capturedImage={capture.capturedImage}
                    queuePosition={capture.queuePosition}
                    onDismiss={capture.dismissResult}
                    onRetry={capture.state === S.ERROR ? capture.dismissResult : undefined}
                    onGoToAttendance={capture.state === S.SUCCESS ? handleGoToAttendance : undefined}
                    onRegisterFace={capture.state === S.UNKNOWN ? handleRegisterFace : undefined}
                />
            )}

            {/* ── BOTTOM CONTROLS ── */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        style={[styles.captureBtn, { borderColor: capture.statusColor }]}
                        onPress={() => {
                            if (capture.locationLockState === "invalid") return;
                            if (
                                capture.state === S.SUCCESS ||
                                capture.state === S.UNKNOWN ||
                                capture.state === S.ERROR
                            ) {
                                capture.dismissResult();
                            } else {
                                capture.manualCapture();
                            }
                        }}
                        disabled={capture.isProcessing || capture.locationLockState === "invalid"}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.captureBtnInner, { backgroundColor: capture.statusColor }]}>
                            {capture.isProcessing ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Ionicons
                                    name={capture.state === S.SUCCESS ? "checkmark" : "scan"}
                                    size={30}
                                    color="#fff"
                                />
                            )}
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Text style={styles.captureHint}>
                    {capture.locationLockState === "invalid"
                        ? "Location not verified"
                        : capture.isProcessing
                          ? "Processing…"
                          : "Tap to capture · or hold still to auto-scan"}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },

    // Permission screen
    permScreen: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
        gap: 10,
    },
    permIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "rgba(0,212,170,0.1)",
        borderWidth: 1,
        borderColor: "rgba(0,212,170,0.25)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    permTitle: {
        fontSize: 22,
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
        marginTop: 8,
        width: "100%",
    },

    // Top bar
    topBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 10,
        zIndex: 20,
    },
    appLabel: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: 0.3,
    },
    topBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(0,0,0,0.45)",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    topBadgeText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 10,
        fontWeight: "600",
    },

    // Status below oval
    statusArea: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 40,
        zIndex: 20,
    },
    statusText: {
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
        textShadowColor: "rgba(0,0,0,0.9)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },

    // Overlays (processing / verifying)
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(5, 8, 20, 0.78)",
        justifyContent: "center",
        alignItems: "center",
        gap: 14,
        zIndex: 50,
    },
    overlayIconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(0,212,170,0.1)",
        borderWidth: 1,
        borderColor: "rgba(0,212,170,0.3)",
        alignItems: "center",
        justifyContent: "center",
    },
    overlayTitle: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600",
        textAlign: "center",
    },
    overlaySubText: {
        color: "rgba(255,255,255,0.38)",
        fontSize: 13,
        textAlign: "center",
    },
    capturedPreview: {
        width: 176,
        height: 176,
        borderRadius: 88,
        borderWidth: 2,
        borderColor: "#00D4AA",
    },

    // Bottom controls
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
        padding: 5,
        alignItems: "center",
        justifyContent: "center",
    },
    captureBtnInner: {
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
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
        textAlign: "center",
    },
});

export default FaceCaptureScreen;
