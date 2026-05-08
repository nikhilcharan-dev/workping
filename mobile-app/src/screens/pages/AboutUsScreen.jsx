import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import { useTheme } from "@/theme";

const values = [
    {
        icon: "rocket-outline",
        title: "Our Mission",
        text: "To provide the most intuitive and powerful admin dashboard experience for businesses of all sizes.",
    },
    {
        icon: "people-outline",
        title: "Our Team",
        text: "A passionate group of designers, developers, and product experts working together to build great tools.",
    },
    {
        icon: "heart-outline",
        title: "Our Values",
        text: "We believe in simplicity, transparency, and putting our users first in everything we build.",
    },
];

const stats = [
    { value: "10K+", label: "Active Users" },
    { value: "50+", label: "Countries" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
];

const AboutUsScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>About Us</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Building the future of admin dashboards, one pixel at a time.
                </Text>

                <View style={styles.statsGrid}>
                    {stats.map((stat, i) => (
                        <Card key={i} style={styles.statCard}>
                            <Card.Body style={styles.statBody}>
                                <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                            </Card.Body>
                        </Card>
                    ))}
                </View>

                {values.map((item, i) => (
                    <Card key={i} style={styles.valueCard}>
                        <Card.Body>
                            <View style={styles.valueRow}>
                                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                                    <Ionicons name={item.icon} size={24} color={colors.primary} />
                                </View>
                                <View style={styles.valueInfo}>
                                    <Text style={[styles.valueTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                                    <Text style={[styles.valueText, { color: colors.textSecondary }]}>{item.text}</Text>
                                </View>
                            </View>
                        </Card.Body>
                    </Card>
                ))}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    pageTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
    subtitle: { fontSize: 14, textAlign: "center", marginTop: 8, marginBottom: 20, lineHeight: 22 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    statCard: { width: "48%", flexGrow: 1 },
    statBody: { alignItems: "center", paddingVertical: 16 },
    statValue: { fontSize: 24, fontWeight: "700" },
    statLabel: { fontSize: 12, marginTop: 4 },
    valueCard: { marginBottom: 12 },
    valueRow: { flexDirection: "row", alignItems: "flex-start" },
    iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    valueInfo: { flex: 1, marginLeft: 12 },
    valueTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
    valueText: { fontSize: 13, lineHeight: 20 },
});

export default AboutUsScreen;
