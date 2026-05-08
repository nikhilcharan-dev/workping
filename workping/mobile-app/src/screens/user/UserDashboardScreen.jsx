import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, RefreshControl, Animated, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import { useTheme } from "@/theme";
import { useAuthContext } from "@/context/useAuthContext";
import httpClient from "@/helpers/httpClient";

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
};

const formatTime = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const projectStatusVariant = (status) => {
    if (status === "active") return "success";
    if (status === "completed") return "primary";
    if (status === "onHold") return "warning";
    return "secondary";
};

const StatCard = ({ icon, label, value, bg, color, colors }) => (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: colors.cardBorder }]}>
        <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
            <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
);

const UserDashboardScreen = () => {
    const navigation = useNavigation();
    const { removeSession } = useAuthContext();
    const { colors } = useTheme();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);
    const [team, setTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [loading]);

    const fetchData = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);

            setError(null);
            const today = new Date().toISOString().split("T")[0];

            const [profileRes, teamRes, teamMembersRes, projectsRes, attendanceRes] = await Promise.allSettled([
                httpClient.get("/api/user/profile"),
                httpClient.get("/api/user/organisation/my-team"),
                httpClient.get("/api/user/organisation/my-team-members"),
                httpClient.get("/api/user/projects/my-projects"),
                httpClient.get("/api/user/attendance/by-date", { params: { date: today } }),
            ]);

            // Standardize Profile Data
            if (profileRes.status === "fulfilled") {
                const pData = profileRes.value.data;
                setProfile(pData);
            } else {
                setError(profileRes.reason?.response?.data?.message || "Failed to load profile");
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Standardize Team Data
            setTeam(teamRes.status === "fulfilled" ? teamRes.value.data : null);

            // Standardize Team Members Data — server returns array of members
            const membersData = teamMembersRes.status === "fulfilled" ? teamMembersRes.value.data : [];
            setTeamMembers(Array.isArray(membersData) ? membersData : []);

            // Standardize Projects Data — server returns { totalRecords, totalPages, projects: [...] }
            const projData = projectsRes.status === "fulfilled" ? projectsRes.value.data : {};
            setProjects(projData?.projects || []);

            // Standardize Today's Attendance
            if (attendanceRes.status === "fulfilled") {
                setTodayAttendance(attendanceRes.value.data);
            } else {
                setTodayAttendance(null);
            }
        } catch (err) {
            console.error("[UserDashboard] Fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Refresh on focus
    useEffect(() => {
        const unsub = navigation.addListener("focus", () => fetchData(true));
        return unsub;
    }, [navigation, fetchData]);

    const onRefresh = useCallback(() => fetchData(true), [fetchData]);

    if (loading) {
        return (
            <ScreenWrapper showFooter={false}>
                <View style={styles.center}>
                    <Spinner size="large" />
                </View>
            </ScreenWrapper>
        );
    }

    if (error) {
        return (
            <ScreenWrapper showFooter={false}>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={52} color={colors.danger} />
                    <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                    <Button variant="danger" outline title="Logout" onPress={removeSession} style={{ marginTop: 16 }} />
                </View>
            </ScreenWrapper>
        );
    }

    const activeProjects = projects.filter((p) => p.project?.status === "active").length;
    const checkInTime = todayAttendance?.checkIn || todayAttendance?.checkInTime || todayAttendance?.timestamp;
    const isCheckedIn = !!checkInTime && !todayAttendance?.checkOut && !todayAttendance?.checkOutTime;

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
            <Animated.View style={{ opacity: fadeAnim, gap: 16 }}>
                {/* Greeting Card */}
                <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
                    <Card.Body>
                        <View style={styles.greetingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.greetingHi}>{getGreeting()},</Text>
                                <Text style={styles.greetingName} numberOfLines={1}>
                                    {profile?.name || "User"}
                                </Text>
                                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                                    <Badge variant="light" pill>
                                        {profile?.roleInTeam || profile?.role || "Member"}
                                    </Badge>
                                    {isCheckedIn && (
                                        <Badge variant="success" pill>
                                            Active
                                        </Badge>
                                    )}
                                </View>
                                {!!(profile?.organization?.name || profile?.organizationId?.name) && (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
                                        <Ionicons name="business-outline" size={13} color="rgba(255,255,255,0.75)" />
                                        <Text
                                            style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: "500" }}
                                        >
                                            {profile.organization?.name || profile.organizationId?.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Avatar name={profile?.name} source={profile?.profileImage} size={68} variant="light" />
                        </View>
                    </Card.Body>
                </Card>

                {/* Today's Attendance Status */}
                <Card>
                    <Card.Body style={styles.attendanceCard}>
                        <View style={styles.attendanceLeft}>
                            <View
                                style={[
                                    styles.attendanceIndicator,
                                    {
                                        backgroundColor: isCheckedIn
                                            ? colors.successSoft
                                            : todayAttendance
                                              ? colors.secondarySoft
                                              : colors.warningSoft,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={
                                        isCheckedIn ? "checkmark-circle" : todayAttendance ? "log-out" : "timer-outline"
                                    }
                                    size={22}
                                    color={
                                        isCheckedIn
                                            ? colors.success
                                            : todayAttendance
                                              ? colors.secondary
                                              : colors.warning
                                    }
                                />
                            </View>
                            <View>
                                <Text style={[styles.attendanceTitle, { color: colors.textPrimary }]}>
                                    {isCheckedIn ? "Checked In" : todayAttendance ? "Checked Out" : "Not Checked In"}
                                </Text>
                                <Text style={[styles.attendanceTime, { color: colors.textMuted }]}>
                                    {checkInTime ? `Since ${formatTime(checkInTime)}` : "Tap to mark attendance"}
                                </Text>
                            </View>
                        </View>
                        <Button
                            variant={isCheckedIn ? "danger" : "primary"}
                            size="sm"
                            title={isCheckedIn ? "Check Out" : "Check In"}
                            icon={
                                <Ionicons
                                    name={isCheckedIn ? "log-out-outline" : "camera-outline"}
                                    size={14}
                                    color="#fff"
                                />
                            }
                            onPress={() => navigation.navigate("Attendance")}
                        />
                    </Card.Body>
                </Card>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <StatCard
                        icon="people-outline"
                        label="Team"
                        value={teamMembers.length}
                        bg={colors.card}
                        color={colors.info}
                        colors={colors}
                    />
                    <StatCard
                        icon="briefcase-outline"
                        label="Projects"
                        value={projects.length}
                        bg={colors.card}
                        color={colors.purple}
                        colors={colors}
                    />
                    <StatCard
                        icon="checkmark-circle-outline"
                        label="Active"
                        value={activeProjects}
                        bg={colors.card}
                        color={colors.success}
                        colors={colors}
                    />
                </View>

                {/* Team Card */}
                {team ? (
                    <Card>
                        <Card.Header>
                            <View style={styles.cardHead}>
                                <Ionicons name="people-circle-outline" size={20} color={colors.primary} />
                                <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>
                                    {team.teamName}
                                </Text>
                            </View>
                        </Card.Header>
                        <Card.Body>
                            {!!team.description && (
                                <Text style={[styles.teamDesc, { color: colors.textSecondary }]}>
                                    {team.description}
                                </Text>
                            )}
                            {team.manager && (
                                <View style={styles.managerRow}>
                                    <Avatar name={team.manager.name} size={36} variant="primary" />
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={[styles.managerName, { color: colors.textPrimary }]}>
                                            {team.manager.name}
                                        </Text>
                                        <Text style={[styles.managerRole, { color: colors.textMuted }]}>
                                            Team Manager
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </Card.Body>
                        {teamMembers.length > 0 && (
                            <Card.Footer>
                                <View style={styles.membersRow}>
                                    {teamMembers.slice(0, 5).map((m, i) => (
                                        <View
                                            key={m._id || i}
                                            style={[
                                                styles.memberBubble,
                                                {
                                                    marginLeft: i === 0 ? 0 : -10,
                                                    zIndex: 5 - i,
                                                    borderColor: colors.card,
                                                },
                                            ]}
                                        >
                                            <Avatar name={m.user?.name} size={30} variant="secondary" />
                                        </View>
                                    ))}
                                    {teamMembers.length > 5 && (
                                        <View
                                            style={[
                                                styles.memberExtra,
                                                {
                                                    backgroundColor: colors.primarySoft,
                                                    marginLeft: -10,
                                                    borderColor: colors.card,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.memberExtraText, { color: colors.primary }]}>
                                                +{teamMembers.length - 5}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={[styles.memberCount, { color: colors.textMuted }]}>
                                        {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
                                    </Text>
                                </View>
                            </Card.Footer>
                        )}
                    </Card>
                ) : (
                    <Card>
                        <Card.Body>
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={36} color={colors.textMuted} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    You haven't been assigned to a team yet.
                                </Text>
                            </View>
                        </Card.Body>
                    </Card>
                )}

                {/* Projects Card */}
                <Card>
                    <Card.Header>
                        <View style={styles.cardHead}>
                            <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                            <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>My Projects</Text>
                            <Badge variant="primary" soft pill>
                                {projects.length}
                            </Badge>
                        </View>
                        {projects.length > 0 && (
                            <TouchableOpacity onPress={() => navigation.navigate("Projects", { projects })}>
                                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>View All</Text>
                            </TouchableOpacity>
                        )}
                    </Card.Header>
                    <Card.Body style={{ paddingVertical: projects.length > 0 ? 8 : 16 }}>
                        {projects.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="briefcase-outline" size={36} color={colors.textMuted} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No projects assigned yet.
                                </Text>
                            </View>
                        ) : (
                            projects.slice(0, 3).map((p, i) => (
                                <TouchableOpacity
                                    key={p._id || i}
                                    style={[
                                        styles.projectRow,
                                        i < Math.min(projects.length, 3) - 1 && {
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.divider,
                                        },
                                    ]}
                                    onPress={() => navigation.navigate("ProjectDetails", { project: p })}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.projectDot,
                                            { backgroundColor: colors[projectStatusVariant(p.project?.status)] + "30" },
                                        ]}
                                    >
                                        <Ionicons
                                            name="briefcase-outline"
                                            size={14}
                                            color={colors[projectStatusVariant(p.project?.status)]}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[styles.projectName, { color: colors.textPrimary }]}
                                            numberOfLines={1}
                                        >
                                            {p.project?.name || "Untitled Project"}
                                        </Text>
                                        <Text style={[styles.projectRole, { color: colors.textMuted }]}>{p.role}</Text>
                                    </View>
                                    <Badge variant={projectStatusVariant(p.project?.status)} soft pill>
                                        {p.project?.status || "active"}
                                    </Badge>
                                </TouchableOpacity>
                            ))
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
        gap: 12,
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 24,
    },
    errorText: {
        fontSize: 15,
        textAlign: "center",
        marginTop: 4,
    },

    // Greeting
    greetingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    greetingHi: {
        fontSize: 13,
        color: "rgba(255,255,255,0.75)",
    },
    greetingName: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fff",
        marginTop: 2,
    },

    // Attendance status
    attendanceCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    attendanceLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    attendanceIndicator: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    attendanceTitle: {
        fontSize: 14,
        fontWeight: "600",
    },
    attendanceTime: {
        fontSize: 12,
        marginTop: 2,
    },

    // Stats
    statsRow: {
        flexDirection: "row",
        gap: 10,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        borderWidth: 1,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    statIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
    },

    // Card header
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

    // Team
    teamDesc: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 12,
    },
    managerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    managerName: {
        fontSize: 14,
        fontWeight: "500",
    },
    managerRole: {
        fontSize: 12,
        marginTop: 1,
    },
    membersRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    memberBubble: {
        borderRadius: 15,
        borderWidth: 2,
    },
    memberExtra: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
    },
    memberExtraText: {
        fontSize: 10,
        fontWeight: "700",
    },
    memberCount: {
        fontSize: 12,
        marginLeft: 12,
    },

    // Projects
    projectRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 10,
    },
    projectDot: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    projectName: {
        fontSize: 14,
        fontWeight: "500",
    },
    projectRole: {
        fontSize: 12,
        marginTop: 1,
    },

    // Empty
    emptyState: {
        alignItems: "center",
        paddingVertical: 12,
        gap: 10,
    },
    emptyText: {
        fontSize: 13,
        textAlign: "center",
    },
});

export default UserDashboardScreen;
