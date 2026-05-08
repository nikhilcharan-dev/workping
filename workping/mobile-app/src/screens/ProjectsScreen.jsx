import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Spinner from "@/components/Spinner";
import { useTheme } from "@/theme";
import httpClient from "@/helpers/httpClient";

const statusVariant = (status) => {
    if (status === "active") return "success";
    if (status === "completed") return "primary";
    if (status === "onHold") return "warning";
    return "secondary";
};

const ROLE_META = {
    manager: { label: "Manager", icon: "shield-checkmark-outline", color: "#3762ea" },
    teamLead: { label: "Team Lead", icon: "ribbon-outline", color: "#6c5dd3" },
    employee: { label: "Employee", icon: "person-outline", color: "#1ea97c" },
};

const RolePill = ({ role, colors }) => {
    const meta = ROLE_META[role] ?? { label: role, icon: "person-outline", color: colors.textSecondary };
    return (
        <View style={[rolePillStyles.pill, { backgroundColor: meta.color + "18" }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[rolePillStyles.text, { color: meta.color }]}>{meta.label}</Text>
        </View>
    );
};

const rolePillStyles = StyleSheet.create({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        marginTop: 4,
    },
    text: {
        fontSize: 11,
        fontWeight: "600",
    },
});

const statusIcon = (status) => {
    if (status === "active") return "play-circle-outline";
    if (status === "completed") return "checkmark-circle-outline";
    if (status === "onHold") return "pause-circle-outline";
    return "ellipse-outline";
};

const ProjectsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { colors } = useTheme();

    const [projects, setProjects] = useState(route.params?.projects || []);
    const [loading, setLoading] = useState(!route.params?.projects);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProjects = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);
            const res = await httpClient.get("/api/user/projects/my-projects");
            setProjects(res.data?.projects || []);
        } catch (e) {
            console.error("[ProjectsScreen]", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!route.params?.projects) fetchProjects();
    }, [fetchProjects, route.params?.projects]);

    const onRefresh = useCallback(() => fetchProjects(true), [fetchProjects]);

    if (loading) {
        return (
            <ScreenWrapper showFooter={false}>
                <View style={styles.center}>
                    <Spinner size="large" />
                </View>
            </ScreenWrapper>
        );
    }

    const active = projects.filter((p) => p.project?.status === "active").length;
    const completed = projects.filter((p) => p.project?.status === "completed").length;
    const onHold = projects.filter((p) => p.project?.status === "onHold").length;

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
            {/* Summary row */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryChip, { backgroundColor: colors.successSoft }]}>
                    <Text style={[styles.summaryNum, { color: colors.success }]}>{active}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.success }]}>Active</Text>
                </View>
                <View style={[styles.summaryChip, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.summaryNum, { color: colors.primary }]}>{completed}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.primary }]}>Completed</Text>
                </View>
                <View style={[styles.summaryChip, { backgroundColor: colors.warningSoft }]}>
                    <Text style={[styles.summaryNum, { color: colors.warning }]}>{onHold}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.warning }]}>On Hold</Text>
                </View>
            </View>

            {projects.length === 0 ? (
                <Card>
                    <Card.Body>
                        <View style={styles.empty}>
                            <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
                            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No projects yet</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                You haven't been assigned to any projects.
                            </Text>
                        </View>
                    </Card.Body>
                </Card>
            ) : (
                projects.map((p, i) => {
                    const variant = statusVariant(p.project?.status);
                    const icon = statusIcon(p.project?.status);
                    return (
                        <TouchableOpacity
                            key={p._id || i}
                            activeOpacity={0.75}
                            onPress={() => navigation.navigate("ProjectDetails", { project: p })}
                        >
                            <Card style={styles.projectCard}>
                                <Card.Body>
                                    <View style={styles.projectHeader}>
                                        <View
                                            style={[
                                                styles.projectIconWrap,
                                                { backgroundColor: colors[variant] + "18" },
                                            ]}
                                        >
                                            <Ionicons name={icon} size={22} color={colors[variant]} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text
                                                style={[styles.projectName, { color: colors.textPrimary }]}
                                                numberOfLines={1}
                                            >
                                                {p.project?.name || "Untitled Project"}
                                            </Text>
                                            {p.projectRole ? (
                                                <RolePill role={p.projectRole} colors={colors} />
                                            ) : (
                                                <Text style={[styles.projectRole, { color: colors.textMuted }]}>
                                                    No role assigned
                                                </Text>
                                            )}
                                        </View>
                                        <Badge variant={variant} soft pill style={{ marginLeft: 8 }}>
                                            {p.project?.status || "active"}
                                        </Badge>
                                    </View>
                                </Card.Body>
                                <Card.Footer>
                                    <View style={styles.projectFooter}>
                                        <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
                                        <Text style={[styles.tapHint, { color: colors.textMuted }]}>
                                            Tap to view details
                                        </Text>
                                    </View>
                                </Card.Footer>
                            </Card>
                        </TouchableOpacity>
                    );
                })
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 24,
        gap: 12,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    summaryRow: {
        flexDirection: "row",
        gap: 10,
    },
    summaryChip: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    summaryNum: {
        fontSize: 20,
        fontWeight: "700",
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: "500",
        marginTop: 2,
    },
    projectCard: {
        marginBottom: 0,
    },
    projectHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    projectIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    projectName: {
        fontSize: 15,
        fontWeight: "600",
    },
    projectRole: {
        fontSize: 12,
        marginTop: 2,
    },
    projectFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    tapHint: {
        fontSize: 12,
    },
    empty: {
        alignItems: "center",
        paddingVertical: 24,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    emptyText: {
        fontSize: 13,
        textAlign: "center",
    },
});

export default ProjectsScreen;
