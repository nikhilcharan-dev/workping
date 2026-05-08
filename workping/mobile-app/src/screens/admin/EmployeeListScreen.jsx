import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Spinner from "@/components/Spinner";
import { useTheme } from "@/theme";
import httpClient from "@/helpers/httpClient";

const STATUS_FILTERS = ["all", "active", "inactive"];

const EmployeeListScreen = () => {
    const { colors } = useTheme();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const PAGE_SIZE = 20;

    const fetchEmployees = useCallback(
        async (pageNum = 1, isRefresh = false, isLoadMore = false) => {
            try {
                if (pageNum === 1 && !isRefresh) setLoading(true);
                else if (isRefresh) setRefreshing(true);
                else if (isLoadMore) setLoadingMore(true);

                const params = { page: pageNum, limit: PAGE_SIZE };
                if (search.trim()) params.search = search.trim();
                if (statusFilter !== "all") params.status = statusFilter;

                const res = await httpClient.get("/api/admin/get-all-employees", { params });
                const empData = res.data || {};
                const list = empData.data || [];
                const total = empData.totalRecords || 0;

                setTotalRecords(total);
                setPage(pageNum);

                if (pageNum === 1) {
                    setEmployees(list);
                } else {
                    setEmployees((prev) => [...prev, ...list]);
                }
            } catch {
                // fail gracefully, keep existing data
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [search, statusFilter]
    );

    useEffect(() => {
        fetchEmployees(1);
    }, [fetchEmployees]);

    const onRefresh = () => fetchEmployees(1, true);

    const loadMore = () => {
        const hasMore = employees.length < totalRecords;
        if (!hasMore || loadingMore || loading) return;
        fetchEmployees(page + 1, false, true);
    };

    const renderEmployee = ({ item }) => (
        <View style={[styles.empRow, { borderBottomColor: colors.divider }]}>
            <Avatar name={item.name || item.email} source={item.profileImage} size={44} variant="primary" />
            <View style={styles.empInfo}>
                <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name || "Unnamed"}
                </Text>
                <Text style={[styles.empEmail, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.email}
                </Text>
                {!!(item.roleInTeam || item.designation) && (
                    <Text style={[styles.empDesig, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.roleInTeam || item.designation}
                    </Text>
                )}
            </View>
            <Badge variant={item.status === "active" || !item.status ? "success" : "secondary"} soft pill>
                {item.status || "active"}
            </Badge>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No employees found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {search ? "Try a different search term." : "No employees have been added yet."}
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return <ActivityIndicator color={colors.primary} style={styles.footerLoader} />;
    };

    return (
        <ScreenWrapper title="Employees" showFooter={false} scrollable={false}>
            {/* Search bar */}
            <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Search by name or email…"
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {!!search && (
                        <TouchableOpacity
                            onPress={() => setSearch("")}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Status filter pills */}
            <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
                {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f;
                    return (
                        <TouchableOpacity
                            key={f}
                            style={[
                                styles.filterPill,
                                { borderColor: active ? colors.primary : colors.border },
                                active && { backgroundColor: colors.primarySoft },
                            ]}
                            onPress={() => setStatusFilter(f)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.filterText, { color: active ? colors.primary : colors.textMuted }]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                {totalRecords > 0 && (
                    <Text style={[styles.countText, { color: colors.textMuted }]}>{totalRecords} total</Text>
                )}
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.center}>
                    <Spinner size="large" />
                </View>
            ) : (
                <FlatList
                    data={employees}
                    keyExtractor={(item, i) => item._id || String(i)}
                    renderItem={renderEmployee}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={employees.length === 0 ? styles.emptyContainer : styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    searchRow: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 42,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        borderBottomWidth: 1,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterText: {
        fontSize: 12,
        fontWeight: "600",
    },
    countText: {
        fontSize: 12,
        marginLeft: "auto",
    },
    listContent: {
        paddingBottom: 24,
    },
    emptyContainer: {
        flexGrow: 1,
    },
    empRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    empInfo: {
        flex: 1,
    },
    empName: {
        fontSize: 14,
        fontWeight: "600",
    },
    empEmail: {
        fontSize: 12,
        marginTop: 2,
    },
    empDesig: {
        fontSize: 12,
        marginTop: 1,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
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
    footerLoader: {
        paddingVertical: 20,
    },
});

export default EmployeeListScreen;
