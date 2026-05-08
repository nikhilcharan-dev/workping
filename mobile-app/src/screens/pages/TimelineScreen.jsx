import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import { useTheme } from "@/theme";

const events = [
    {
        id: "1",
        date: "Aug 2025",
        title: "Project Inception",
        description:
            "WorkPing was conceived at Aditya University. Initial server repository created and foundational architecture designed.",
        icon: "flag-outline",
        color: "#ef4444",
        tag: "Kickoff",
    },
    {
        id: "2",
        date: "Sep 2025",
        title: "Meta & WhatsApp Integration",
        description:
            "Integrated Meta Business API, configured webhooks, and laid the groundwork for WhatsApp-based notifications.",
        icon: "logo-whatsapp",
        color: "#22c55e",
        tag: "Integration",
    },
    {
        id: "3",
        date: "Dec 2025",
        title: "Core Backend Built",
        description:
            "Database schemas defined, JWT authentication configured, Google & Microsoft SSO enabled, Socket.io integrated, and Flask ML pipeline initiated.",
        icon: "server-outline",
        color: "#3762ea",
        tag: "Backend",
    },
    {
        id: "4",
        date: "Dec 2025",
        title: "Face Recognition Pipeline",
        description:
            "Camera integration tested and Flask API connected for ML-powered face recognition attendance verification.",
        icon: "scan-outline",
        color: "#8b5cf6",
        tag: "ML / AI",
    },
    {
        id: "5",
        date: "Jan 2026",
        title: "Payments & Mail Services",
        description:
            "PhonePe payment gateway integrated, mail service activated, cookie-based sessions secured, and API routes normalised and hardened against scripted access.",
        icon: "card-outline",
        color: "#f5a623",
        tag: "Payments",
    },
    {
        id: "6",
        date: "Mar 2026",
        title: "CI/CD Pipeline Live",
        description:
            "GitHub Actions CI/CD pipeline configured and deployed. Auto-deployment to production VM via PM2 cluster. Admin dashboard pages integrated.",
        icon: "git-branch-outline",
        color: "#06b6d4",
        tag: "DevOps",
    },
    {
        id: "7",
        date: "Mar 2026",
        title: "WhatsApp Phase 1 & Payments",
        description:
            "WhatsApp Business messaging routes completed. PayPe/PhonePe webhook testing finalised. Holiday management routes shipped.",
        icon: "chatbubbles-outline",
        color: "#22c55e",
        tag: "Feature",
    },
    {
        id: "8",
        date: "Apr 2026",
        title: "Mobile App Launched",
        description:
            "React Native mobile app released with attendance screen, face capture, navigation overhaul, and live API integration.",
        icon: "phone-portrait-outline",
        color: "#ec4899",
        tag: "Mobile",
    },
    {
        id: "9",
        date: "Apr 2026",
        title: "Geofencing & Refresh Tokens",
        description:
            "Polygon-based geofencing with multiple area pins deployed. 7-day mobile JWT refresh token system implemented for seamless sessions.",
        icon: "location-outline",
        color: "#8b5cf6",
        tag: "Security",
    },
    {
        id: "10",
        date: "Apr 2026",
        title: "Manager Permissions",
        description:
            "Role-based permission escalation for managers rolled out. Authorised manager routes and admin-level privilege controls added.",
        icon: "shield-checkmark-outline",
        color: "#3762ea",
        tag: "RBAC",
    },
    {
        id: "11",
        date: "May 2026",
        title: "Face API & Stability",
        description:
            "Face recognition API updated with improved accuracy. Cookie session bug patched. Platform is stable and live.",
        icon: "checkmark-circle-outline",
        color: "#22c55e",
        tag: "Live",
    },
];

const TAG_COLORS = {
    Kickoff: "#ef444420",
    Integration: "#22c55e20",
    Backend: "#3762ea20",
    "ML / AI": "#8b5cf620",
    Payments: "#f5a62320",
    DevOps: "#06b6d420",
    Feature: "#22c55e20",
    Mobile: "#ec489920",
    Security: "#8b5cf620",
    RBAC: "#3762ea20",
    Live: "#22c55e20",
};

const TimelineScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Timeline</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    From first commit to production — the real story
                </Text>

                <View style={[styles.statsRow, { borderColor: colors.border }]}>
                    {[
                        { label: "Months", value: "9" },
                        { label: "Milestones", value: "11" },
                        { label: "Contributors", value: "6" },
                        { label: "Commits", value: "100+" },
                    ].map((s) => (
                        <View key={s.label} style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{s.value}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.timeline}>
                    {events.map((event, i) => (
                        <View key={event.id} style={styles.timelineItem}>
                            <View style={styles.lineCol}>
                                <View style={[styles.dot, { backgroundColor: event.color }]}>
                                    <Ionicons name={event.icon} size={13} color="#fff" />
                                </View>
                                {i < events.length - 1 && (
                                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                                )}
                            </View>

                            <Card style={styles.eventCard}>
                                <Card.Body>
                                    <View style={styles.cardHeader}>
                                        <Text style={[styles.eventDate, { color: event.color }]}>{event.date}</Text>
                                        <View
                                            style={[
                                                styles.tag,
                                                { backgroundColor: TAG_COLORS[event.tag] ?? "#88888820" },
                                            ]}
                                        >
                                            <Text style={[styles.tagText, { color: event.color }]}>{event.tag}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
                                        {event.title}
                                    </Text>
                                    <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>
                                        {event.description}
                                    </Text>
                                </Card.Body>
                            </Card>
                        </View>
                    ))}
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    pageTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
    subtitle: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 16, lineHeight: 18 },

    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 20,
    },
    statItem: { alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "700" },
    statLabel: { fontSize: 11, marginTop: 2 },

    timeline: {},
    timelineItem: { flexDirection: "row", marginBottom: 0 },
    lineCol: { alignItems: "center", width: 30 },
    dot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", zIndex: 1 },
    line: { width: 2, flex: 1, marginTop: -2, minHeight: 12 },

    eventCard: { flex: 1, marginLeft: 12, marginBottom: 12 },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    eventDate: { fontSize: 11, fontWeight: "700" },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    tagText: { fontSize: 10, fontWeight: "600" },
    eventTitle: { fontSize: 14, fontWeight: "700", marginBottom: 5 },
    eventDesc: { fontSize: 12, lineHeight: 18 },
});

export default TimelineScreen;
