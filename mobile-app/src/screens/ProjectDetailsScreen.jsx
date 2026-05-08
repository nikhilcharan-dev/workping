import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import { useTheme } from "@/theme";
import { useAuthContext } from "@/context/useAuthContext";
import httpClient from "@/helpers/httpClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusVariant = (s) =>
    s === "active" ? "success" : s === "completed" ? "primary" : s === "onHold" ? "warning" : "secondary";

const statusIcon = (s) =>
    s === "active"
        ? "play-circle"
        : s === "completed"
          ? "checkmark-circle"
          : s === "onHold"
            ? "pause-circle"
            : "ellipse";

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

const cleanPhone = (p) => p?.replace(/[^\d+]/g, "") || null;

const openEmail = (email) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert("Error", "Could not open email client."));
};

const openWhatsApp = (phone) => {
    const n = cleanPhone(phone);
    if (!n) {
        Alert.alert("No phone number", "This member has no phone number on file.");
        return;
    }
    Linking.openURL(`https://wa.me/${n.replace(/^\+/, "")}`).catch(() =>
        Alert.alert("WhatsApp not found", "Make sure WhatsApp is installed.")
    );
};

// Role display config
const ROLE_CONFIG = {
    manager: { label: "Manager", icon: "shield-checkmark-outline", color: "#3762ea" },
    teamLead: { label: "Team Lead", icon: "ribbon-outline", color: "#6c5dd3" },
    employee: { label: "Employee", icon: "person-outline", color: "#1ea97c" },
};

const getRoleCfg = (role) => ROLE_CONFIG[role] ?? { label: role || "Member", icon: "person-outline", color: "#68798b" };

// ─── Sub-components ─────────────────────────────────────────────────────────

const InfoRow = ({ icon, label, value, colors }) => (
    <View style={styles.infoRow}>
        <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={icon} size={15} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value || "—"}</Text>
        </View>
    </View>
);

const MemberRow = ({ member, isMe, colors }) => {
    const user = member.user ?? member; // handles projectManager shape too
    // projectRole comes from ProjectTeam lookup; fall back for bare projectManager objects
    const cfg = getRoleCfg(member.projectRole ?? (member._id && !member.user ? "manager" : undefined));
    const hasEmail = !!user.email;
    const hasPhone = !!cleanPhone(user.phone);

    return (
        <View style={[styles.memberCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {/* Top row: avatar + info */}
            <View style={styles.memberTop}>
                <View style={[styles.memberAvatarWrap, { backgroundColor: cfg.color + "18" }]}>
                    <Avatar name={user.name} source={user.profileImage} size={44} />
                </View>
                <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {user.name || "Unknown"}
                        </Text>
                        {isMe && (
                            <View style={[styles.youChip, { backgroundColor: colors.primarySoft }]}>
                                <Text style={[styles.youChipText, { color: colors.primary }]}>You</Text>
                            </View>
                        )}
                    </View>
                    {/* Role badge */}
                    <View style={[styles.roleBadge, { backgroundColor: cfg.color + "18" }]}>
                        <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                        <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {/* Email sub-label */}
                    {!!user.email && (
                        <Text style={[styles.memberEmailText, { color: colors.textMuted }]} numberOfLines={1}>
                            {user.email}
                        </Text>
                    )}
                </View>
            </View>

            {/* Contact buttons — hidden for own card */}
            {!isMe && (hasEmail || hasPhone) && (
                <View style={[styles.memberActions, { borderTopColor: colors.divider }]}>
                    {hasEmail && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primarySoft }]}
                            onPress={() => openEmail(user.email)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="mail-outline" size={15} color={colors.primary} />
                            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Email</Text>
                        </TouchableOpacity>
                    )}
                    {hasPhone && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#25D36614" }]}
                            onPress={() => openWhatsApp(user.phone)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                            <Text style={[styles.actionBtnText, { color: "#25D366" }]}>WhatsApp</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const RoleSection = ({ title, icon, color, members, currentUserId, currentUserEmail, colors }) => {
    if (members.length === 0) return null;
    return (
        <View style={styles.roleSection}>
            <View style={styles.roleSectionHeader}>
                <View style={[styles.roleSectionIcon, { backgroundColor: color + "1A" }]}>
                    <Ionicons name={icon} size={14} color={color} />
                </View>
                <Text style={[styles.roleSectionTitle, { color: colors.textSecondary }]}>{title}</Text>
                <View style={[styles.roleSectionCount, { backgroundColor: color + "1A" }]}>
                    <Text style={[styles.roleSectionCountText, { color }]}>{members.length}</Text>
                </View>
            </View>
            <View style={styles.roleSectionList}>
                {members.map((m, i) => {
                    const uid = (m.user?._id || m._id)?.toString();
                    const uemail = m.user?.email || m.email;
                    const isMe = uid === currentUserId || uemail === currentUserEmail;
                    return <MemberRow key={m._id || i} member={m} isMe={isMe} colors={colors} />;
                })}
            </View>
        </View>
    );
};

// ─── Screen ─────────────────────────────────────────────────────────────────

const ProjectDetailsScreen = () => {
    const route = useRoute();
    const { colors } = useTheme();
    const { user: currentUser } = useAuthContext();

    // membership = { _id, project: { _id, name, status, … } }  — from ProjectsScreen
    const membership = route.params?.project ?? {};
    const projectId = membership?.project?._id;

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        if (!projectId) {
            setLoading(false);
            return;
        }
        httpClient
            .get(`/api/user/projects/${projectId}`)
            .then((res) => setDetails(res.data))
            .catch(() => setFetchError(true))
            .finally(() => setLoading(false));
    }, [projectId]);

    // project comes from the API response (now includes projectManager + org)
    // Fall back to route param project while loading
    const project = details?.project ?? membership?.project ?? {};
    const allMembers = details?.members ?? [];

    // ── Group members by projectRole (set by backend from ProjectTeam) ──────
    // projectRole = "manager" | "teamLead" | "employee"
    const managers = allMembers.filter((m) => m.projectRole === "manager");
    const teamLeads = allMembers.filter((m) => m.projectRole === "teamLead");
    const employees = allMembers.filter((m) => m.projectRole === "employee" || !m.projectRole);

    // Project manager (from Project.projectManager) may not be in ProjectTeam —
    // if so, surface them as a manager card so the section is never empty.
    const pm = project.projectManager;
    const pmAlreadyInMembers =
        pm && managers.some((m) => m.user?._id?.toString() === pm._id?.toString() || m.user?.email === pm.email);
    const managersWithPM = pm && !pmAlreadyInMembers ? [{ _id: pm._id, user: pm }, ...managers] : managers;

    const currentUserId = currentUser?._id?.toString();
    const currentUserEmail = currentUser?.email;

    return (
        <ScreenWrapper title="Project Details" showFooter={false} contentContainerStyle={styles.container}>
            {/* ── Hero banner ───────────────────────────────────────────────── */}
            <View style={[styles.hero, { backgroundColor: colors.primary }]}>
                <View style={[styles.heroIconWrap, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                    <Ionicons name={statusIcon(project.status)} size={30} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.heroName} numberOfLines={2}>
                        {project.name || "Untitled Project"}
                    </Text>
                    <View style={styles.heroMeta}>
                        <Badge variant="light" pill>
                            {project.status || "active"}
                        </Badge>
                        {!!project.organization?.name && (
                            <View style={styles.orgPill}>
                                <Ionicons name="business-outline" size={11} color="rgba(255,255,255,0.7)" />
                                <Text style={styles.orgPillText}>{project.organization.name}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* ── Project info ─────────────────────────────────────────────── */}
            <Card>
                <Card.Header>
                    <View style={styles.cardHead}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                        <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Project Info</Text>
                    </View>
                </Card.Header>
                <Card.Body style={{ gap: 14 }}>
                    <InfoRow icon="flag-outline" label="Status" value={project.status} colors={colors} />
                    {!!project.description && (
                        <InfoRow
                            icon="document-text-outline"
                            label="Description"
                            value={project.description}
                            colors={colors}
                        />
                    )}
                    {!!formatDate(project.assignedDate) && (
                        <InfoRow
                            icon="calendar-outline"
                            label="Assigned"
                            value={formatDate(project.assignedDate)}
                            colors={colors}
                        />
                    )}
                    {!!formatDate(project.dueDate) && (
                        <InfoRow
                            icon="calendar-clear-outline"
                            label="Due Date"
                            value={formatDate(project.dueDate)}
                            colors={colors}
                        />
                    )}
                    {!!project.contractedBy && (
                        <InfoRow icon="briefcase-outline" label="Client" value={project.contractedBy} colors={colors} />
                    )}
                    {!project.description && !project.dueDate && !project.contractedBy && (
                        <Text style={[styles.emptyNote, { color: colors.textMuted }]}>
                            No additional details on file.
                        </Text>
                    )}
                </Card.Body>
            </Card>

            {/* ── Team ─────────────────────────────────────────────────────── */}
            <Card>
                <Card.Header>
                    <View style={styles.cardHead}>
                        <Ionicons name="people-outline" size={16} color={colors.primary} />
                        <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Team</Text>
                        {allMembers.length > 0 && (
                            <Badge variant="primary" soft pill>
                                {allMembers.length}
                            </Badge>
                        )}
                    </View>
                </Card.Header>
                <Card.Body style={{ paddingHorizontal: 0, paddingBottom: 4 }}>
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator color={colors.primary} size="small" />
                            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading team…</Text>
                        </View>
                    ) : fetchError ? (
                        <Text style={[styles.emptyNote, { color: colors.textMuted, paddingHorizontal: 16 }]}>
                            Could not load team details.
                        </Text>
                    ) : allMembers.length === 0 && !pm ? (
                        <Text style={[styles.emptyNote, { color: colors.textMuted, paddingHorizontal: 16 }]}>
                            No team members found.
                        </Text>
                    ) : (
                        <>
                            <RoleSection
                                title="Manager"
                                icon="shield-checkmark-outline"
                                color="#3762ea"
                                members={managersWithPM}
                                currentUserId={currentUserId}
                                currentUserEmail={currentUserEmail}
                                colors={colors}
                            />
                            <RoleSection
                                title="Team Leads"
                                icon="ribbon-outline"
                                color="#6c5dd3"
                                members={teamLeads}
                                currentUserId={currentUserId}
                                currentUserEmail={currentUserEmail}
                                colors={colors}
                            />
                            <RoleSection
                                title="Employees"
                                icon="person-outline"
                                color="#1ea97c"
                                members={employees}
                                currentUserId={currentUserId}
                                currentUserEmail={currentUserEmail}
                                colors={colors}
                            />
                        </>
                    )}
                </Card.Body>
            </Card>
        </ScreenWrapper>
    );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 32,
        gap: 14,
    },

    // Hero
    hero: {
        borderRadius: 16,
        padding: 18,
        flexDirection: "row",
        alignItems: "flex-start",
    },
    heroIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    heroName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        lineHeight: 24,
    },
    heroMeta: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
    },
    orgPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    orgPillText: {
        fontSize: 12,
        fontWeight: "500",
        color: "rgba(255,255,255,0.85)",
    },

    // Card header
    cardHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    cardHeadTitle: {
        fontSize: 14,
        fontWeight: "600",
        flex: 1,
    },

    // Info rows
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    infoLabel: {
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontWeight: "600",
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "500",
        marginTop: 2,
        lineHeight: 20,
    },

    // Role section
    roleSection: {
        marginBottom: 4,
    },
    roleSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },
    roleSectionIcon: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    roleSectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        flex: 1,
    },
    roleSectionCount: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    roleSectionCountText: {
        fontSize: 11,
        fontWeight: "700",
    },
    roleSectionList: {
        paddingHorizontal: 12,
        gap: 8,
    },

    // Member card
    memberCard: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
        marginBottom: 4,
    },
    memberTop: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        gap: 12,
    },
    memberAvatarWrap: {
        borderRadius: 24,
        padding: 2,
    },
    memberInfo: {
        flex: 1,
        gap: 4,
    },
    memberNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    memberName: {
        fontSize: 14,
        fontWeight: "600",
    },
    youChip: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
    },
    youChipText: {
        fontSize: 11,
        fontWeight: "700",
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: "600",
    },
    memberEmailText: {
        fontSize: 12,
        marginTop: 1,
    },

    // Contact actions
    memberActions: {
        flexDirection: "row",
        gap: 8,
        padding: 10,
        borderTopWidth: 1,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: "600",
    },

    // Misc
    emptyNote: {
        fontSize: 13,
        textAlign: "center",
        paddingVertical: 8,
    },
    loadingWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        justifyContent: "center",
        paddingVertical: 12,
    },
    loadingText: {
        fontSize: 13,
    },
});

export default ProjectDetailsScreen;
