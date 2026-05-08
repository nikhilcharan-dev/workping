import React, { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Animated, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height: SCREEN_H } = Dimensions.get("window");

// ── Error type classifier ────────────────────────────────────────────────────
const ERROR_TYPES = {
    location: {
        icon: "location-outline",
        color: "#F59E0B",
        title: "Location Invalid",
        hint: "You must be within the allowed attendance zone to mark attendance.",
    },
    ip: {
        icon: "globe-outline",
        color: "#EF4444",
        title: "IP Not Authorized",
        hint: "Your network IP address is not permitted for this location.",
    },
    timeout: {
        icon: "timer-outline",
        color: "#EF4444",
        title: "Request Timed Out",
        hint: "The server took too long to respond. Check your connection and try again.",
    },
    network: {
        icon: "wifi-outline",
        color: "#EF4444",
        title: "Network Error",
        hint: "Unable to reach the server. Check your internet connection.",
    },
    ratelimit: {
        icon: "ban-outline",
        color: "#F59E0B",
        title: "Too Many Attempts",
        hint: "Please wait a moment before trying again.",
    },
    server: {
        icon: "server-outline",
        color: "#EF4444",
        title: "Server Error",
        hint: "Something went wrong on our end. Please try again shortly.",
    },
};

const classifyError = (msg = "") => {
    const m = msg.toLowerCase();
    if (
        m.includes("location") ||
        m.includes("region") ||
        m.includes("geofence") ||
        m.includes("range") ||
        m.includes("zone")
    )
        return "location";
    if (
        m.includes(" ip") ||
        m.includes("ip ") ||
        m.includes("ip_") ||
        m.includes("access denied") ||
        m.includes("not allowed from")
    )
        return "ip";
    if (m.includes("timeout") || m.includes("timed out")) return "timeout";
    if (
        m.includes("network") ||
        m.includes("connection") ||
        m.includes("fetch") ||
        m.includes("socket") ||
        m.includes("unreachable")
    )
        return "network";
    if (m.includes("too many") || m.includes("rate limit") || m.includes("throttle")) return "ratelimit";
    return "server";
};

// ── Component ────────────────────────────────────────────────────────────────
const FaceCaptureResultCard = ({
    state,
    result,
    errorMsg,
    capturedImage,
    queuePosition,
    onDismiss,
    onRetry,
    onGoToAttendance,
    onRegisterFace,
}) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;
    const iconScaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 13, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 13, useNativeDriver: true }),
        ]).start(() => {
            Animated.spring(iconScaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
        });
    }, []);

    const isSuccess = state === "success";
    const isUnknown = state === "unknown";
    const isError = state === "error";
    const isQueued = state === "queued";

    const isMatch = isSuccess && result?.success && result?.person;
    const confidence = Math.round((result?.confidence || 0) * 100);

    // Attendance timestamps — server uses camelCase (checkIn / checkOut)
    const checkInTime = result?.attendance?.checkIn;
    const checkOutTime = result?.attendance?.checkOut;
    const isCheckOut = !!(checkInTime && checkOutTime);
    const attendanceTs = checkOutTime || checkInTime;

    // Late if checking in after 9:30 AM
    const isLate = (() => {
        if (!checkInTime || isCheckOut) return false;
        const t = new Date(checkInTime);
        return t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 30);
    })();

    const displayTime = attendanceTs
        ? new Date(attendanceTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const errType = isError ? classifyError(errorMsg) : null;
    const errInfo = errType ? ERROR_TYPES[errType] : null;

    return (
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: opacityAnim }]}>
            {/* Frozen face preview blurred behind */}
            {capturedImage && (
                <Image source={{ uri: capturedImage }} style={styles.bgImage} resizeMode="cover" blurRadius={18} />
            )}
            <View style={styles.bgDim} />

            {/* Slide-up panel */}
            <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
                {/* Drag handle */}
                <View style={styles.handle} />

                {/* Close button */}
                <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} activeOpacity={0.7}>
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.45)" />
                </TouchableOpacity>

                {/* ── SUCCESS ── */}
                {isMatch && (
                    <View style={styles.content}>
                        <Animated.View
                            style={[
                                styles.avatarRing,
                                { borderColor: "#00D4AA", transform: [{ scale: iconScaleAnim }] },
                            ]}
                        >
                            {result.person.avatar_url ? (
                                <Image source={{ uri: result.person.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: "rgba(0,212,170,0.1)" }]}>
                                    <Text style={[styles.avatarInitial, { color: "#00D4AA" }]}>
                                        {result.person.name?.[0]?.toUpperCase() ?? "?"}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.statusBadge, { backgroundColor: "#00D4AA" }]}>
                                <Ionicons name="checkmark" size={11} color="#000" />
                            </View>
                        </Animated.View>

                        <View
                            style={[
                                styles.resultTag,
                                { backgroundColor: "rgba(0,212,170,0.12)", borderColor: "rgba(0,212,170,0.3)" },
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={13} color="#00D4AA" />
                            <Text style={[styles.resultTagText, { color: "#00D4AA" }]}>Attendance Marked</Text>
                        </View>

                        <Text style={styles.personName}>{result.person.name}</Text>
                        {result.person.employee_id && <Text style={styles.empId}>#{result.person.employee_id}</Text>}

                        <View style={styles.chips}>
                            <View
                                style={[
                                    styles.chip,
                                    isCheckOut
                                        ? {
                                              backgroundColor: "rgba(14,165,233,0.12)",
                                              borderColor: "rgba(14,165,233,0.35)",
                                          }
                                        : isLate
                                          ? {
                                                backgroundColor: "rgba(245,158,11,0.12)",
                                                borderColor: "rgba(245,158,11,0.35)",
                                            }
                                          : {
                                                backgroundColor: "rgba(16,185,129,0.12)",
                                                borderColor: "rgba(16,185,129,0.35)",
                                            },
                                ]}
                            >
                                <Ionicons
                                    name={isCheckOut ? "log-out-outline" : isLate ? "time-outline" : "checkmark-circle"}
                                    size={12}
                                    color={isCheckOut ? "#0EA5E9" : isLate ? "#F59E0B" : "#10B981"}
                                />
                                <Text
                                    style={[
                                        styles.chipText,
                                        { color: isCheckOut ? "#0EA5E9" : isLate ? "#F59E0B" : "#10B981" },
                                    ]}
                                >
                                    {isCheckOut ? "Checked Out" : isLate ? "Late" : "On Time"}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.chip,
                                    { backgroundColor: "rgba(0,212,170,0.1)", borderColor: "rgba(0,212,170,0.35)" },
                                ]}
                            >
                                <Ionicons name="shield-checkmark-outline" size={12} color="#00D4AA" />
                                <Text style={[styles.chipText, { color: "#00D4AA" }]}>{confidence}% match</Text>
                            </View>
                        </View>

                        <Text style={styles.timeText}>{displayTime}</Text>

                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                { backgroundColor: "rgba(0,212,170,0.12)", borderColor: "rgba(0,212,170,0.3)" },
                            ]}
                            onPress={onGoToAttendance || onDismiss}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={15} color="#00D4AA" />
                            <Text style={[styles.actionBtnText, { color: "#00D4AA" }]}>View Attendance</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── UNKNOWN ── */}
                {isUnknown && (
                    <View style={styles.content}>
                        <Animated.View
                            style={[
                                styles.iconRing,
                                {
                                    borderColor: "rgba(245,158,11,0.5)",
                                    backgroundColor: "rgba(245,158,11,0.08)",
                                    transform: [{ scale: iconScaleAnim }],
                                },
                            ]}
                        >
                            <Ionicons name="person-outline" size={38} color="#F59E0B" />
                        </Animated.View>

                        <View
                            style={[
                                styles.resultTag,
                                { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" },
                            ]}
                        >
                            <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                            <Text style={[styles.resultTagText, { color: "#F59E0B" }]}>Face Not Recognized</Text>
                        </View>

                        <Text style={[styles.personName, { color: "#F59E0B" }]}>Not in System</Text>
                        <Text style={styles.errorDesc}>
                            Your face wasn't found in the database.{"\n"}Register your face to mark attendance.
                        </Text>

                        <Text style={styles.timeText}>{displayTime}</Text>

                        {onRegisterFace ? (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        styles.actionBtnHalf,
                                        {
                                            backgroundColor: "rgba(255,255,255,0.05)",
                                            borderColor: "rgba(255,255,255,0.12)",
                                        },
                                    ]}
                                    onPress={onDismiss}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.actionBtnText, { color: "rgba(255,255,255,0.5)" }]}>
                                        Dismiss
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        styles.actionBtnHalf,
                                        {
                                            backgroundColor: "rgba(0,212,170,0.12)",
                                            borderColor: "rgba(0,212,170,0.35)",
                                        },
                                    ]}
                                    onPress={onRegisterFace}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="person-add-outline" size={14} color="#00D4AA" />
                                    <Text style={[styles.actionBtnText, { color: "#00D4AA" }]}>Register Face</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[
                                    styles.actionBtn,
                                    { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" },
                                ]}
                                onPress={onDismiss}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>Close</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── ERROR ── */}
                {isError && errInfo && (
                    <View style={styles.content}>
                        <Animated.View
                            style={[
                                styles.iconRing,
                                {
                                    borderColor: errInfo.color + "60",
                                    backgroundColor: errInfo.color + "12",
                                    transform: [{ scale: iconScaleAnim }],
                                },
                            ]}
                        >
                            <Ionicons name={errInfo.icon} size={38} color={errInfo.color} />
                        </Animated.View>

                        <View
                            style={[
                                styles.resultTag,
                                { backgroundColor: errInfo.color + "15", borderColor: errInfo.color + "40" },
                            ]}
                        >
                            <Ionicons name="alert-circle-outline" size={13} color={errInfo.color} />
                            <Text style={[styles.resultTagText, { color: errInfo.color }]}>Error</Text>
                        </View>

                        <Text style={[styles.personName, { color: errInfo.color }]}>{errInfo.title}</Text>
                        <Text style={styles.errorDesc}>{errInfo.hint}</Text>

                        {/* Raw message if different from hint */}
                        {errorMsg && (
                            <View style={styles.rawErrorBox}>
                                <Text style={styles.rawErrorText} numberOfLines={2}>
                                    {errorMsg}
                                </Text>
                            </View>
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[
                                    styles.actionBtn,
                                    styles.actionBtnHalf,
                                    {
                                        backgroundColor: "rgba(255,255,255,0.05)",
                                        borderColor: "rgba(255,255,255,0.12)",
                                    },
                                ]}
                                onPress={onDismiss}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.actionBtnText, { color: "rgba(255,255,255,0.5)" }]}>Dismiss</Text>
                            </TouchableOpacity>
                            {onRetry && (
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        styles.actionBtnHalf,
                                        { backgroundColor: errInfo.color + "18", borderColor: errInfo.color + "50" },
                                    ]}
                                    onPress={onRetry}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="refresh-outline" size={14} color={errInfo.color} />
                                    <Text style={[styles.actionBtnText, { color: errInfo.color }]}>Retry</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* ── QUEUED ── */}
                {isQueued && (
                    <View style={styles.content}>
                        <Animated.View
                            style={[
                                styles.iconRing,
                                {
                                    borderColor: "rgba(139,92,246,0.5)",
                                    backgroundColor: "rgba(139,92,246,0.1)",
                                    transform: [{ scale: iconScaleAnim }],
                                },
                            ]}
                        >
                            <Ionicons name="people-outline" size={38} color="#8B5CF6" />
                        </Animated.View>

                        <View
                            style={[
                                styles.resultTag,
                                { backgroundColor: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" },
                            ]}
                        >
                            <Ionicons name="hourglass-outline" size={13} color="#8B5CF6" />
                            <Text style={[styles.resultTagText, { color: "#8B5CF6" }]}>In Queue</Text>
                        </View>

                        <Text style={[styles.personName, { color: "#8B5CF6" }]}>
                            {queuePosition > 0 ? `#${queuePosition} in line` : "Queued"}
                        </Text>
                        <Text style={styles.errorDesc}>
                            Your request is being processed.{"\n"}Please keep the app open.
                        </Text>
                    </View>
                )}
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        zIndex: 100,
        justifyContent: "flex-end",
    },
    bgImage: {
        ...StyleSheet.absoluteFillObject,
    },
    bgDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(4, 6, 18, 0.82)",
    },

    // Slide-up panel
    panel: {
        backgroundColor: "rgba(10, 14, 30, 0.97)",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: "rgba(255,255,255,0.08)",
        paddingBottom: 36,
        elevation: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignSelf: "center",
        marginTop: 12,
        marginBottom: 4,
    },
    closeBtn: {
        position: "absolute",
        top: 14,
        right: 16,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.07)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },

    content: {
        alignItems: "center",
        paddingTop: 20,
        paddingHorizontal: 28,
        gap: 8,
    },

    // Avatar ring (success)
    avatarRing: {
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 2.5,
        padding: 3,
        marginBottom: 4,
        position: "relative",
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 36,
    },
    avatarFallback: {
        width: "100%",
        height: "100%",
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitial: {
        fontSize: 28,
        fontWeight: "700",
    },
    statusBadge: {
        position: "absolute",
        bottom: 1,
        right: 1,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "rgba(10,14,30,1)",
    },

    // Icon ring (error / unknown / queued)
    iconRing: {
        width: 82,
        height: 82,
        borderRadius: 41,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },

    // Result type tag
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

    // Text
    personName: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginTop: 2,
    },
    empId: {
        color: "rgba(255,255,255,0.28)",
        fontSize: 12,
        fontWeight: "500",
    },
    errorDesc: {
        color: "rgba(255,255,255,0.42)",
        fontSize: 13,
        textAlign: "center",
        lineHeight: 20,
        marginTop: 2,
    },
    timeText: {
        color: "rgba(255,255,255,0.2)",
        fontSize: 11,
        marginTop: 2,
    },

    // Chips row (success)
    chips: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 11,
        fontWeight: "600",
    },

    // Raw error message box
    rawErrorBox: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        width: "100%",
        marginTop: 4,
    },
    rawErrorText: {
        color: "rgba(255,255,255,0.35)",
        fontSize: 11,
        textAlign: "center",
        lineHeight: 16,
        fontFamily: "monospace",
    },

    // Action buttons
    actionRow: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
        marginTop: 8,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        width: "100%",
        marginTop: 8,
    },
    actionBtnHalf: {
        flex: 1,
        width: undefined,
        marginTop: 0,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: "600",
    },
});

export default FaceCaptureResultCard;
