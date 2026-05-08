import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const plans = [
    {
        id: "1",
        name: "Starter",
        price: "$9",
        period: "/month",
        popular: false,
        features: ["5 Projects", "10 GB Storage", "Email Support", "Basic Analytics"],
    },
    {
        id: "2",
        name: "Professional",
        price: "$29",
        period: "/month",
        popular: true,
        features: [
            "Unlimited Projects",
            "100 GB Storage",
            "Priority Support",
            "Advanced Analytics",
            "Team Collaboration",
            "API Access",
        ],
    },
    {
        id: "3",
        name: "Enterprise",
        price: "$99",
        period: "/month",
        popular: false,
        features: [
            "Unlimited Everything",
            "1 TB Storage",
            "24/7 Phone Support",
            "Custom Analytics",
            "Dedicated Account Manager",
            "SLA Guarantee",
            "Custom Integrations",
        ],
    },
];

const PricingScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Pricing Plans</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Choose the plan that fits your needs
                </Text>

                {plans.map((plan) => (
                    <Card
                        key={plan.id}
                        style={[styles.planCard, plan.popular && { borderWidth: 2, borderColor: colors.primary }]}
                    >
                        <Card.Body>
                            {plan.popular && (
                                <View style={styles.popularBadge}>
                                    <Badge variant="primary">Most Popular</Badge>
                                </View>
                            )}
                            <Text style={[styles.planName, { color: colors.textPrimary }]}>{plan.name}</Text>
                            <View style={styles.priceRow}>
                                <Text style={[styles.price, { color: colors.primary }]}>{plan.price}</Text>
                                <Text style={[styles.period, { color: colors.textSecondary }]}>{plan.period}</Text>
                            </View>
                            {plan.features.map((feature, i) => (
                                <View key={i} style={styles.featureRow}>
                                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                                    <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                                </View>
                            ))}
                            <TouchableOpacity
                                style={[
                                    styles.planBtn,
                                    {
                                        backgroundColor: plan.popular ? colors.primary : "transparent",
                                        borderWidth: plan.popular ? 0 : 1,
                                        borderColor: colors.primary,
                                    },
                                ]}
                            >
                                <Text style={[styles.planBtnText, { color: plan.popular ? "#fff" : colors.primary }]}>
                                    Get Started
                                </Text>
                            </TouchableOpacity>
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
    subtitle: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 20 },
    planCard: { marginBottom: 16, borderRadius: 12, overflow: "hidden" },
    popularBadge: { alignItems: "flex-start", marginBottom: 8 },
    planName: { fontSize: 18, fontWeight: "600" },
    priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8, marginBottom: 16 },
    price: { fontSize: 36, fontWeight: "700" },
    period: { fontSize: 14, marginLeft: 4 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
    featureText: { fontSize: 13 },
    planBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
    planBtnText: { fontSize: 15, fontWeight: "600" },
});

export default PricingScreen;
