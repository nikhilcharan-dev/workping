import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import { activityStreamData } from "@/assets/data/topbar";
import { toSentenceCase } from "@/utils/change-casing";
import Avatar from "../Avatar";

const getActivityIcon = (type) => {
    const map = {
        coding: "code-slash-outline",
        design: "color-palette-outline",
        project: "folder-outline",
        default: "ellipse-outline",
    };
    return map[type] || map.default;
};

const ActivityItem = ({ title, time, content, status, type, variant }) => {
    const { colors } = useTheme();
    const variantColors = {
        primary: colors.primary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
        info: colors.info,
        secondary: colors.secondary,
    };
    const color = variantColors[variant] || colors.primary;

    return (
        <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: color }]}>
                <Ionicons name={getActivityIcon(type)} size={16} color="#fff" />
            </View>
            <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                    <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>{title}</Text>
                    {status && (
                        <View style={[styles.statusBadge, { backgroundColor: color + "20" }]}>
                            <Text style={[styles.statusText, { color }]}>{toSentenceCase(status)}</Text>
                        </View>
                    )}
                </View>
                {content && <Text style={[styles.activityText, { color: colors.textSecondary }]}>{content}</Text>}
                <Text style={[styles.activityTime, { color: colors.textMuted }]}>
                    {time ? new Date(time).toDateString() : ""}
                </Text>
            </View>
        </View>
    );
};

const ActivityStream = ({ open, toggle }) => {
    const { colors } = useTheme();
    const activityList = activityStreamData || [];

    return (
        <Modal visible={open} animationType="slide" transparent={false} onRequestClose={toggle}>
            <View style={[styles.container, { backgroundColor: colors.bodyBg }]}>
                <View style={[styles.header, { backgroundColor: colors.primary }]}>
                    <Text style={styles.headerTitle}>Activity Stream</Text>
                    <TouchableOpacity onPress={toggle}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.timeline, { borderLeftColor: colors.border }]}>
                        {activityList.length > 0 ? (
                            activityList.map((activity, idx) => <ActivityItem {...activity} key={idx} />)
                        ) : (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No Recent Activity</Text>
                        )}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    timeline: {
        borderLeftWidth: 1,
        marginLeft: 16,
        paddingLeft: 16,
    },
    activityItem: {
        flexDirection: "row",
        marginBottom: 24,
    },
    activityDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -32,
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityHeader: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 4,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "600",
    },
    activityText: {
        fontSize: 13,
        marginBottom: 4,
    },
    activityTime: {
        fontSize: 12,
    },
    emptyText: {
        fontSize: 16,
        textAlign: "center",
        paddingVertical: 40,
    },
});

export default ActivityStream;
