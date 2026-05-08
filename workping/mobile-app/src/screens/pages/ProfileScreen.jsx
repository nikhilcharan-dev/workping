import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Spinner from "@/components/Spinner";
import { useTheme } from "@/theme";
import { useAuthContext } from "@/context/useAuthContext";
import httpClient from "@/helpers/httpClient";

const ProfileScreen = () => {
    const { colors } = useTheme();
    const { user } = useAuthContext();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isAdmin = user?.role === "admin";

    const fetchProfile = useCallback(
        async (isRefresh = false) => {
            try {
                if (!isRefresh) setLoading(true);
                else setRefreshing(true);
                const endpoint = isAdmin ? "/api/admin/profile" : "/api/user/profile";
                const res = await httpClient.get(endpoint);
                setProfile(res.data);
            } catch (err) {
                console.error("[ProfileScreen] fetch error:", err);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [isAdmin]
    );

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const onRefresh = useCallback(() => fetchProfile(true), [fetchProfile]);

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={[styles.container, { justifyContent: "center", alignItems: "center", flex: 1 }]}>
                    <Spinner size="large" />
                </View>
            </ScreenWrapper>
        );
    }

    const displayName = profile?.name || user?.name || "User";
    const displayRole = profile?.role || user?.role || "Member";
    const displayEmail = profile?.email || user?.email || "-";
    const displayPhone = profile?.phone || profile?.phoneNumber || "-";
    const displayGender = profile?.gender || "-";
    const displayAddress = profile?.address || "-";
    const displayOrg = profile?.organization?.name || "-";
    const displayTeam = profile?.team?.teamName || "-";

    const details = [
        { icon: "mail-outline", label: "Email", value: displayEmail },
        { icon: "call-outline", label: "Phone", value: displayPhone },
        { icon: "briefcase-outline", label: "Role", value: displayRole },
        ...(profile?.organization ? [{ icon: "business-outline", label: "Organization", value: displayOrg }] : []),
        ...(profile?.team ? [{ icon: "people-outline", label: "Team", value: displayTeam }] : []),
        ...(profile?.gender ? [{ icon: "person-outline", label: "Gender", value: displayGender }] : []),
        ...(profile?.dob ? [{ icon: "calendar-outline", label: "Date of Birth", value: profile.dob }] : []),
        ...(profile?.address ? [{ icon: "location-outline", label: "Address", value: displayAddress }] : []),
    ];

    return (
        <ScreenWrapper
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
            <Card style={styles.profileCard}>
                <Card.Body style={styles.profileBody}>
                    <Avatar name={displayName} source={profile?.profileImage} size={80} />
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
                    <Badge variant="primary" soft>
                        {displayRole}
                    </Badge>
                </Card.Body>
            </Card>

            <Card style={styles.section}>
                <Card.Header>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Details</Text>
                </Card.Header>
                <Card.Body>
                    {details.map((item, i) => (
                        <View
                            key={i}
                            style={[
                                styles.detailRow,
                                i < details.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                            ]}
                        >
                            <View style={styles.detailLeft}>
                                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                            </View>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{item.value}</Text>
                        </View>
                    ))}
                </Card.Body>
            </Card>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    profileCard: { marginBottom: 12 },
    profileBody: { alignItems: "center", paddingVertical: 24 },
    name: { fontSize: 20, fontWeight: "700", marginTop: 12, marginBottom: 8 },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "600" },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
    detailLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    detailLabel: { fontSize: 13 },
    detailValue: { fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" },
});

export default ProfileScreen;
