import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Spinner from "@/components/Spinner";
import { useTheme } from "@/theme";
import { useAuthContext } from "@/context/useAuthContext";
import httpClient from "@/helpers/httpClient";

const StatCard = ({ icon, label, value, color, colors }) => (
    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.statIconBg, { backgroundColor: color + "18" }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
);

const ActionRow = ({ icon, label, subtitle, color, colors, onPress }) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.actionIcon, { backgroundColor: color + "18" }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>{label}</Text>
            {subtitle && <Text style={[styles.actionSubtext, { color: colors.textMuted }]}>{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
);

const AdminDashboardScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuthContext();
    const { colors } = useTheme();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        organizations: [],
        projects: 0,
        recentEmployees: [],
    });

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [loading]);

    const fetchAdminData = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);

            const [employeesRes, orgRes, projectsRes] = await Promise.allSettled([
                httpClient.get("/api/admin/get-all-employees"),
                httpClient.get("/api/admin/organization"),
                httpClient.get("/api/admin/project"),
            ]);

            const empData = employeesRes.status === "fulfilled" ? employeesRes.value.data : {};
            const orgData = orgRes.status === "fulfilled" ? orgRes.value.data : {};
            const projData = projectsRes.status === "fulfilled" ? projectsRes.value.data : {};

            // Server /get-all-employees returns { data, totalRecords, totalPages }
            const empList = empData.data || [];
            // Server /organization returns { organizations, totalRecords, totalPages }
            const orgList = orgData.organizations || [];

            setStats({
                totalEmployees: empData.totalRecords || empList.length || 0,
                organizations: orgList,
                projects: projData.totalRecords || 0,
                recentEmployees: empList.slice(0, 5),
            });
        } catch (err) {
            console.error("[AdminDashboard] Fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    const onRefresh = useCallback(() => fetchAdminData(true), [fetchAdminData]);

    const now = new Date();
    const hours = now.getHours();
    const greeting = hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

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
            contentContainerStyle={styles.container}
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
                {/* Welcome Card */}
                <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
                    <Card.Body>
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.welcomeText}>{greeting},</Text>
                                <Text style={styles.adminName}>{user?.name || "Administrator"}</Text>
                                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                                    <Badge variant="light" pill>
                                        System Admin
                                    </Badge>
                                </View>
                            </View>
                            <Avatar name={user?.name} size={64} variant="light" />
                        </View>
                    </Card.Body>
                </Card>

                {/* Stats Cards */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="people"
                        label="Employees"
                        value={stats.totalEmployees}
                        color={colors.primary}
                        colors={colors}
                    />
                    <StatCard
                        icon="business"
                        label="Organizations"
                        value={stats.organizations.length}
                        color={colors.success}
                        colors={colors}
                    />
                    <StatCard
                        icon="briefcase"
                        label="Projects"
                        value={stats.projects}
                        color={colors.info}
                        colors={colors}
                    />
                </View>

                {/* Quick Actions */}
                <Card>
                    <Card.Header>
                        <View style={styles.cardHead}>
                            <Ionicons name="flash-outline" size={18} color={colors.primary} />
                            <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
                        </View>
                    </Card.Header>
                    <Card.Body style={{ paddingVertical: 4 }}>
                        <ActionRow
                            icon="people-outline"
                            label="Manage Employees"
                            subtitle="View and manage team members"
                            color={colors.primary}
                            colors={colors}
                        />
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <ActionRow
                            icon="business-outline"
                            label="Organization Settings"
                            subtitle="Configure your organization"
                            color={colors.success}
                            colors={colors}
                        />
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <ActionRow
                            icon="finger-print-outline"
                            label="Mark Attendance"
                            subtitle="Check in via face recognition"
                            color={colors.info}
                            colors={colors}
                            onPress={() => navigation.navigate("Attendance")}
                        />
                    </Card.Body>
                </Card>

                {/* Recent Employees */}
                {stats.recentEmployees.length > 0 && (
                    <Card>
                        <Card.Header>
                            <View style={styles.cardHead}>
                                <Ionicons name="people-outline" size={18} color={colors.primary} />
                                <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>
                                    Recent Employees
                                </Text>
                                <Badge variant="primary" soft pill>
                                    {stats.totalEmployees}
                                </Badge>
                            </View>
                        </Card.Header>
                        <Card.Body style={{ paddingVertical: 4 }}>
                            {stats.recentEmployees.map((emp, i) => (
                                <View key={emp._id || i}>
                                    <View style={styles.employeeRow}>
                                        <Avatar
                                            name={emp.name || emp.email}
                                            source={emp.profileImage}
                                            size={38}
                                            variant="primary"
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[styles.employeeName, { color: colors.textPrimary }]}
                                                numberOfLines={1}
                                            >
                                                {emp.name || "Unnamed"}
                                            </Text>
                                            <Text
                                                style={[styles.employeeEmail, { color: colors.textMuted }]}
                                                numberOfLines={1}
                                            >
                                                {emp.email}
                                            </Text>
                                        </View>
                                        <Badge variant={emp.status === "active" ? "success" : "secondary"} soft pill>
                                            {emp.status || "active"}
                                        </Badge>
                                    </View>
                                    {i < stats.recentEmployees.length - 1 && (
                                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                                    )}
                                </View>
                            ))}
                        </Card.Body>
                    </Card>
                )}

                {/* Organizations */}
                {stats.organizations.length > 0 && (
                    <Card>
                        <Card.Header>
                            <View style={styles.cardHead}>
                                <Ionicons name="business-outline" size={18} color={colors.primary} />
                                <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Organizations</Text>
                            </View>
                        </Card.Header>
                        <Card.Body style={{ paddingVertical: 4 }}>
                            {stats.organizations.slice(0, 3).map((org, i) => (
                                <View key={org._id || i}>
                                    <View style={styles.orgRow}>
                                        <View style={[styles.orgIcon, { backgroundColor: colors.primarySoft }]}>
                                            <Ionicons name="business" size={16} color={colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[styles.orgName, { color: colors.textPrimary }]}
                                                numberOfLines={1}
                                            >
                                                {org.name || org.organizationName}
                                            </Text>
                                            {org.industry && (
                                                <Text style={[styles.orgIndustry, { color: colors.textMuted }]}>
                                                    {org.industry}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {i < Math.min(stats.organizations.length, 3) - 1 && (
                                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                                    )}
                                </View>
                            ))}
                        </Card.Body>
                    </Card>
                )}
            </Animated.View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 24,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    welcomeText: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 13,
    },
    adminName: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "700",
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: "row",
        gap: 10,
    },
    statBox: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    statIconBg: {
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

    // Actions
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: 12,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    actionText: {
        fontSize: 14,
        fontWeight: "500",
    },
    actionSubtext: {
        fontSize: 12,
        marginTop: 1,
    },
    divider: {
        height: 1,
        width: "100%",
    },

    // Employees
    employeeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
    },
    employeeName: {
        fontSize: 14,
        fontWeight: "500",
    },
    employeeEmail: {
        fontSize: 12,
        marginTop: 1,
    },

    // Organizations
    orgRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
    },
    orgIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    orgName: {
        fontSize: 14,
        fontWeight: "500",
    },
    orgIndustry: {
        fontSize: 12,
        marginTop: 1,
    },
});

export default AdminDashboardScreen;
