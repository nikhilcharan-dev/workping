import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Animated, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Spinner from "@/components/Spinner";
import Button from "@/components/Button";
import { useTheme } from "@/theme";
import { useAuthContext } from "@/context/useAuthContext";
import httpClient from "@/helpers/httpClient";

const { width: SCREEN_W } = Dimensions.get("window");

const formatTime = (dateStr) => {
    if (!dateStr) return "--:--";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDuration = (ms) => {
    if (!ms || ms < 0) return "--";
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
};

const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const StatusBadge = ({ status, colors }) => {
    const map = {
        present: { variant: "success", label: "Present", icon: "checkmark-circle" },
        absent: { variant: "danger", label: "Absent", icon: "close-circle" },
        late: { variant: "warning", label: "Late", icon: "time" },
        "half-day": { variant: "info", label: "Half Day", icon: "timer" },
        "checked-in": { variant: "success", label: "Checked In", icon: "log-in" },
        "checked-out": { variant: "secondary", label: "Checked Out", icon: "log-out" },
    };
    const cfg = map[status] || map.present;

    return (
        <Badge variant={cfg.variant} soft pill>
            {cfg.label}
        </Badge>
    );
};

const AttendanceScreen = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { user } = useAuthContext();
    const isAdmin = user?.role === "admin";
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [todayRecords, setTodayRecords] = useState([]);
    const [weekRecords, setWeekRecords] = useState([]);

    // Staggered card entrance anims [statusCard, ctaButton, weekCard, activityCard]
    const cardAnims = useRef(
        [0, 1, 2, 3].map(() => ({
            opacity: new Animated.Value(0),
            translateY: new Animated.Value(18),
        }))
    ).current;

    // CTA button press scale
    const btnScale = useRef(new Animated.Value(1)).current;

    // Icon pulse
    const iconPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Staggered entrance
        const anims = cardAnims.map((anim, i) =>
            Animated.parallel([
                Animated.timing(anim.opacity, { toValue: 1, duration: 380, delay: i * 70, useNativeDriver: true }),
                Animated.spring(anim.translateY, {
                    toValue: 0,
                    tension: 60,
                    friction: 10,
                    delay: i * 70,
                    useNativeDriver: true,
                }),
            ])
        );
        Animated.stagger(0, anims).start();

        // Continuous icon pulse
        const pulse = () => {
            Animated.sequence([
                Animated.timing(iconPulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
                Animated.timing(iconPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
            ]).start(() => pulse());
        };
        pulse();
    }, []);

    const onPressIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
    const onPressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

    const fetchAttendance = useCallback(
        async (isRefresh = false) => {
            try {
                if (!isRefresh) setLoading(true);
                else setRefreshing(true);

                // Admin role has no personal attendance endpoints — only show the face capture button
                if (isAdmin) {
                    setTodayRecords([]);
                    setWeekRecords([]);
                    return;
                }

                const today = getToday();

                // Calculate week start (Sunday) and end (Saturday) for weekly query
                const now = new Date();
                const dayOfWeek = now.getDay();
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - dayOfWeek);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                const formatDate = (d) =>
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

                const [todayRes, weekRes] = await Promise.allSettled([
                    httpClient.get("/api/user/attendance/by-date", { params: { date: today } }),
                    httpClient.get("/api/user/attendance/my-attendance", {
                        params: { startDate: formatDate(weekStart), endDate: formatDate(weekEnd), limit: 7 },
                    }),
                ]);

                if (todayRes.status === "fulfilled") {
                    const aData = todayRes.value.data;
                    // The server /by-date returns the attendance object directly as the data payload
                    setTodayRecords(aData && aData._id ? [aData] : []);
                }

                if (weekRes.status === "fulfilled") {
                    const aData = weekRes.value.data;
                    // my-attendance returns { totalRecords, totalPages, attendance: [...] }
                    setWeekRecords(aData.attendance || []);
                }
            } catch (err) {
                console.error("[AttendanceScreen] fetch error:", err);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [isAdmin]
    );

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    // Refresh when returning from face capture
    useEffect(() => {
        const unsub = navigation.addListener("focus", () => {
            fetchAttendance(true);
        });
        return unsub;
    }, [navigation, fetchAttendance]);

    const onRefresh = useCallback(() => fetchAttendance(true), [fetchAttendance]);

    const latestCheckIn = todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;
    const checkInTime =
        latestCheckIn?.checkIn || latestCheckIn?.checkInTime || latestCheckIn?.timestamp || latestCheckIn?.createdAt;
    const checkOutTime = latestCheckIn?.checkOut || latestCheckIn?.checkOutTime;
    const isCheckedIn = !!checkInTime && !checkOutTime;
    const todayStatus = latestCheckIn?.status || (isCheckedIn ? "checked-in" : null);

    const now = new Date();
    const hours = now.getHours();
    const greeting = hours < 12 ? "Good Morning" : hours < 17 ? "Good Afternoon" : "Good Evening";

    // Calculate today's duration
    const todayDuration = checkInTime
        ? checkOutTime
            ? new Date(checkOutTime) - new Date(checkInTime)
            : Date.now() - new Date(checkInTime).getTime()
        : 0;

    // Week day labels
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayDayIndex = now.getDay();

    if (loading) {
        return (
            <ScreenWrapper showFooter={false}>
                <View style={styles.center}>
                    <Spinner size="large" />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper
            showFooter={false}
            contentContainerStyle={styles.scrollContainer}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
        >
            {/* Today's Status Card */}
            <Animated.View
                style={{ opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }}
            >
                <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
                    <Card.Body>
                        <Text style={styles.greetingText}>{greeting}</Text>
                        <Text style={styles.dateText}>
                            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </Text>

                        {todayStatus ? (
                            <View style={styles.statusRow}>
                                <View style={styles.statusItem}>
                                    <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
                                    <View>
                                        <Text style={styles.statusLabel}>Check In</Text>
                                        <Text style={styles.statusValue}>{formatTime(checkInTime)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
                                <View style={styles.statusItem}>
                                    <View
                                        style={[
                                            styles.statusDot,
                                            { backgroundColor: checkOutTime ? "#EF4444" : "rgba(255,255,255,0.3)" },
                                        ]}
                                    />
                                    <View>
                                        <Text style={styles.statusLabel}>Check Out</Text>
                                        <Text style={styles.statusValue}>{formatTime(checkOutTime)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
                                <View style={styles.statusItem}>
                                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
                                    <View>
                                        <Text style={styles.statusLabel}>Duration</Text>
                                        <Text style={styles.statusValue}>{formatDuration(todayDuration)}</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.noCheckIn}>
                                <Ionicons name="timer-outline" size={20} color="rgba(255,255,255,0.5)" />
                                <Text style={styles.noCheckInText}>No check-in recorded today</Text>
                            </View>
                        )}
                    </Card.Body>
                </Card>
            </Animated.View>

            {/* Check In / Check Out Button */}
            <Animated.View
                style={{
                    opacity: cardAnims[1].opacity,
                    transform: [{ translateY: cardAnims[1].translateY }, { scale: btnScale }],
                }}
            >
                <TouchableOpacity
                    style={[
                        styles.checkInButton,
                        {
                            backgroundColor: isCheckedIn ? colors.danger : colors.success,
                            shadowColor: isCheckedIn ? colors.danger : colors.success,
                        },
                    ]}
                    onPress={() => navigation.navigate("FaceCapture")}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    activeOpacity={1}
                >
                    <View style={styles.checkInContent}>
                        <Animated.View style={[styles.checkInIconWrap, { transform: [{ scale: iconPulse }] }]}>
                            <Ionicons
                                name={isCheckedIn ? "log-out-outline" : "person-circle-outline"}
                                size={28}
                                color="#fff"
                            />
                        </Animated.View>
                        <View>
                            <Text style={styles.checkInTitle}>{isCheckedIn ? "Check Out" : "Mark Attendance"}</Text>
                            <Text style={styles.checkInSubtitle}>
                                {isCheckedIn ? "Tap to check out via face scan" : "Tap to check in via face scan"}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </Animated.View>

            {/* Week Overview */}
            <Animated.View
                style={{ opacity: cardAnims[2].opacity, transform: [{ translateY: cardAnims[2].translateY }] }}
            >
                <Card>
                    <Card.Header>
                        <View style={styles.cardHead}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                            <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>This Week</Text>
                        </View>
                    </Card.Header>
                    <Card.Body>
                        <View style={styles.weekGrid}>
                            {weekDays.map((day, idx) => {
                                const isToday = idx === todayDayIndex;
                                const isPast = idx < todayDayIndex;
                                const dayRecord = weekRecords.find((r) => {
                                    const d = new Date(r.date || r.checkIn || r.createdAt);
                                    return d.getDay() === idx;
                                });
                                const hasRecord = !!dayRecord;

                                return (
                                    <View
                                        key={day}
                                        style={[
                                            styles.weekDay,
                                            isToday && {
                                                backgroundColor: colors.primarySoft,
                                                borderColor: colors.primary,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.weekDayLabel,
                                                { color: isToday ? colors.primary : colors.textMuted },
                                            ]}
                                        >
                                            {day}
                                        </Text>
                                        <View
                                            style={[
                                                styles.weekDayDot,
                                                {
                                                    backgroundColor: hasRecord
                                                        ? colors.success
                                                        : isPast
                                                          ? colors.danger + "40"
                                                          : colors.border,
                                                },
                                            ]}
                                        >
                                            {hasRecord && <Ionicons name="checkmark" size={10} color="#fff" />}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </Card.Body>
                </Card>
            </Animated.View>

            {/* Today's Records */}
            <Animated.View
                style={{ opacity: cardAnims[3].opacity, transform: [{ translateY: cardAnims[3].translateY }] }}
            >
                <Card>
                    <Card.Header>
                        <View style={styles.cardHead}>
                            <Ionicons name="list-outline" size={18} color={colors.primary} />
                            <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Today's Activity</Text>
                            {todayRecords.length > 0 && (
                                <Badge variant="primary" soft pill>
                                    {todayRecords.length}
                                </Badge>
                            )}
                        </View>
                    </Card.Header>
                    <Card.Body style={{ paddingVertical: todayRecords.length > 0 ? 8 : 16 }}>
                        {todayRecords.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
                                    <Ionicons name="calendar-outline" size={28} color={colors.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No records yet</Text>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    Mark your attendance to see records here
                                </Text>
                            </View>
                        ) : (
                            todayRecords.map((record, i) => {
                                const time =
                                    record.checkIn || record.checkInTime || record.timestamp || record.createdAt;
                                const status = record.status || (record.verified ? "present" : "checked-in");
                                return (
                                    <View
                                        key={record._id || i}
                                        style={[
                                            styles.recordRow,
                                            i < todayRecords.length - 1 && {
                                                borderBottomWidth: 1,
                                                borderBottomColor: colors.divider,
                                            },
                                        ]}
                                    >
                                        <View style={[styles.recordIcon, { backgroundColor: colors.successSoft }]}>
                                            <Ionicons name="person-circle" size={16} color={colors.success} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
                                                Attendance #{i + 1}
                                            </Text>
                                            <Text style={[styles.recordTime, { color: colors.textMuted }]}>
                                                {formatTime(time)}
                                                {record.method && ` via ${record.method}`}
                                            </Text>
                                        </View>
                                        <StatusBadge status={status} colors={colors} />
                                    </View>
                                );
                            })
                        )}
                    </Card.Body>
                </Card>
            </Animated.View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        minHeight: 300,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 32,
        gap: 12,
    },
    greetingText: {
        fontSize: 14,
        color: "rgba(255,255,255,0.75)",
        marginBottom: 2,
    },
    dateText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 16,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: 12,
    },
    statusItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusLabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.6)",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
        marginTop: 1,
    },
    statusDivider: {
        width: 1,
        height: 28,
        marginHorizontal: 8,
    },
    noCheckIn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: 14,
    },
    noCheckInText: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 13,
    },

    // Check-in button
    checkInButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 14,
        padding: 18,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    checkInContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    checkInIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    checkInTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    checkInSubtitle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
        marginTop: 2,
    },

    // Card head
    cardHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    cardHeadTitle: {
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
    },

    // Week grid
    weekGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    weekDay: {
        alignItems: "center",
        gap: 8,
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "transparent",
        minWidth: 38,
    },
    weekDayLabel: {
        fontSize: 11,
        fontWeight: "600",
    },
    weekDayDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },

    // Records
    recordRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 10,
    },
    recordIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    recordTitle: {
        fontSize: 14,
        fontWeight: "500",
    },
    recordTime: {
        fontSize: 12,
        marginTop: 1,
    },

    // Empty
    emptyState: {
        alignItems: "center",
        paddingVertical: 20,
        gap: 8,
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "600",
    },
    emptyText: {
        fontSize: 13,
        textAlign: "center",
    },
});

export default AttendanceScreen;
