import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import { useTheme } from "@/theme";

const faqs = [
    {
        id: "1",
        q: "How do I reset my password?",
        a: 'Navigate to Settings → Security → Reset Password or use the "Forgot Password" link on the login screen.',
    },
    {
        id: "2",
        q: "How can I update my profile?",
        a: "Go to your Profile page and click the Edit button to update your personal information, avatar, and contact details.",
    },
    {
        id: "3",
        q: "What payment methods are supported?",
        a: "We support all major credit/debit cards, PayPal, and bank transfers. You can manage payment methods in the Billing section.",
    },
    {
        id: "4",
        q: "How do I contact support?",
        a: "You can reach our support team via the Contact Us page, email at support@workping.com, or through the in-app chat widget.",
    },
    {
        id: "5",
        q: "Can I export my data?",
        a: "Yes! Go to Settings → Data Management → Export. You can export data in CSV, JSON, or PDF formats.",
    },
    {
        id: "6",
        q: "How do I manage team members?",
        a: "Navigate to Settings → Team Management to invite, remove, or change roles of team members.",
    },
];

const FAQsScreen = () => {
    const { colors } = useTheme();
    const [expanded, setExpanded] = useState(null);

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={styles.header}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>FAQs</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Frequently asked questions</Text>
            </View>
            <FlatList
                data={faqs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Card style={{ marginBottom: 8 }}>
                        <TouchableOpacity
                            onPress={() => setExpanded(expanded === item.id ? null : item.id)}
                            activeOpacity={0.7}
                        >
                            <Card.Body>
                                <View style={styles.row}>
                                    <Text style={[styles.question, { color: colors.textPrimary }]}>{item.q}</Text>
                                    <Ionicons
                                        name={expanded === item.id ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={colors.textSecondary}
                                    />
                                </View>
                                {expanded === item.id && (
                                    <Text style={[styles.answer, { color: colors.textSecondary }]}>{item.a}</Text>
                                )}
                            </Card.Body>
                        </TouchableOpacity>
                    </Card>
                )}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingVertical: 12 },
    pageTitle: { fontSize: 22, fontWeight: "700" },
    subtitle: { fontSize: 13, marginTop: 4 },
    listContent: { padding: 16, paddingTop: 0 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    question: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
    answer: { fontSize: 13, lineHeight: 20, marginTop: 10 },
});

export default FAQsScreen;
