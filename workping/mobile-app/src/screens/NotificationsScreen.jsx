import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Spinner from "@/components/Spinner";
import { useTheme } from "@/theme";
import { useAuthContext } from "@/context/useAuthContext";
import httpClient from "@/helpers/httpClient";

const TYPE_ICON = {
    success: { name: "checkmark-circle", color: "#1ea97c" },
    warning: { name: "warning", color: "#f7b84b" },
    error: { name: "close-circle", color: "#f1556c" },
    info: { name: "information-circle", color: "#4fc6e1" },
    attendance: { name: "finger-print", color: "#3762ea" },
    project: { name: "briefcase", color: "#6c5dd3" },
};

const getTypeIcon = (type = "info") => TYPE_ICON[type] || TYPE_ICON.info;

const timeAgo = (dateStr) => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

const NotificationItem = ({ item, colors, onPress }) => {
    const { name: iconName, color: iconColor } = getTypeIcon(item.type);
    const isUnread = !item.read;

    return (
        <TouchableOpacity
            style={[
                styles.item,
                { borderBottomColor: colors.divider },
                isUnread && { backgroundColor: colors.primarySoft },
            ]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconWrap, { backgroundColor: iconColor + "1A" }]}>
                <Ionicons name={iconName} size={22} color={iconColor} />
            </View>
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title || "Notification"}
                    </Text>
                    <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                        {item.createdAt ? timeAgo(item.createdAt) : ""}
                    </Text>
                </View>
                {!!item.message && (
                    <Text style={[styles.itemMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.message}
                    </Text>
                )}
            </View>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
    );
};

const NotificationsScreen = () => {
    const { colors } = useTheme();
    const { user } = useAuthContext();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const endpoint = user?.role === "admin" ? "/api/admin/notifications" : "/api/user/notifications";

    const fetchNotifications = useCallback(
        async (isRefresh = false) => {
            try {
                if (isRefresh) setRefreshing(true);
                const res = await httpClient.get(endpoint);
                const data = res.data;
                setNotifications(Array.isArray(data) ? data : data?.notifications || []);
            } catch {
                setNotifications([]);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [endpoint]
    );

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleItemPress = async (item) => {
        if (item.read) return;
        try {
            await httpClient.patch(`${endpoint}/${item._id}/read`);
            setNotifications((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
        } catch {
            // mark read optimistically even if API fails
            setNotifications((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await httpClient.patch(`${endpoint}/mark-all-read`);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={52} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No notifications right now. Check back later.
            </Text>
        </View>
    );

    return (
        <ScreenWrapper title="Notifications" showFooter={false} scrollable={false}>
            {/* Header actions */}
            {unreadCount > 0 && (
                <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.unreadLabel, { color: colors.textMuted }]}>{unreadCount} unread</Text>
                    <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                        <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all as read</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <Spinner size="large" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item, i) => item._id || String(i)}
                    renderItem={({ item }) => (
                        <NotificationItem item={item} colors={colors} onPress={handleItemPress} />
                    )}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchNotifications(true)}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    unreadLabel: {
        fontSize: 13,
    },
    markAllText: {
        fontSize: 13,
        fontWeight: "600",
    },
    item: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 14,
        borderBottomWidth: 1,
        gap: 12,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: "600",
        flex: 1,
    },
    itemTime: {
        fontSize: 11,
        flexShrink: 0,
    },
    itemMessage: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        flexShrink: 0,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyContainer: {
        flexGrow: 1,
    },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: "center",
        lineHeight: 20,
    },
});

export default NotificationsScreen;
