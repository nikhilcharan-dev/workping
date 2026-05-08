import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const order = {
    id: "#ORD-2024-001",
    date: "January 15, 2024",
    status: "Delivered",
    statusVariant: "success",
    customer: { name: "Sarah Johnson", email: "sarah@example.com", phone: "+1 (555) 012-3456" },
    shipping: { address: "123 Main Street", city: "New York, NY 10001", method: "Express Shipping" },
    items: [
        { name: "Wireless Headphones", qty: 1, price: "$59.99" },
        { name: "USB-C Hub Adapter", qty: 2, price: "$39.99" },
    ],
    subtotal: "$139.97",
    shipping_cost: "$9.99",
    tax: "$12.04",
    total: "$162.00",
};

const OrderDetailsScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.titleRow}>
                    <Text style={[styles.orderId, { color: colors.textPrimary }]}>{order.id}</Text>
                    <Badge variant={order.statusVariant} soft>
                        {order.status}
                    </Badge>
                </View>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{order.date}</Text>

                <Card style={styles.section}>
                    <Card.Header>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Customer</Text>
                    </Card.Header>
                    <Card.Body>
                        <InfoRow icon="person" label={order.customer.name} colors={colors} />
                        <InfoRow icon="mail" label={order.customer.email} colors={colors} />
                        <InfoRow icon="call" label={order.customer.phone} colors={colors} />
                    </Card.Body>
                </Card>

                <Card style={styles.section}>
                    <Card.Header>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipping</Text>
                    </Card.Header>
                    <Card.Body>
                        <InfoRow icon="location" label={order.shipping.address} colors={colors} />
                        <InfoRow icon="business" label={order.shipping.city} colors={colors} />
                        <InfoRow icon="car" label={order.shipping.method} colors={colors} />
                    </Card.Body>
                </Card>

                <Card style={styles.section}>
                    <Card.Header>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Items</Text>
                    </Card.Header>
                    <Card.Body>
                        {order.items.map((item, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.itemRow,
                                    i < order.items.length - 1 && {
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
                                    <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                                        Qty: {item.qty}
                                    </Text>
                                </View>
                                <Text style={[styles.itemPrice, { color: colors.textPrimary }]}>{item.price}</Text>
                            </View>
                        ))}
                    </Card.Body>
                </Card>

                <Card style={styles.section}>
                    <Card.Body>
                        <SummaryRow label="Subtotal" value={order.subtotal} colors={colors} />
                        <SummaryRow label="Shipping" value={order.shipping_cost} colors={colors} />
                        <SummaryRow label="Tax" value={order.tax} colors={colors} />
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total</Text>
                            <Text style={[styles.totalValue, { color: colors.primary }]}>{order.total}</Text>
                        </View>
                    </Card.Body>
                </Card>
            </View>
        </ScreenWrapper>
    );
};

const InfoRow = ({ icon, label, colors }) => (
    <View style={styles.infoRow}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textPrimary }]}>{label}</Text>
    </View>
);

const SummaryRow = ({ label, value, colors }) => (
    <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { padding: 16 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    orderId: { fontSize: 20, fontWeight: "700" },
    date: { fontSize: 13, marginTop: 4, marginBottom: 16 },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "600" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
    infoText: { fontSize: 14 },
    itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    itemName: { fontSize: 14, fontWeight: "600" },
    itemQty: { fontSize: 12, marginTop: 2 },
    itemPrice: { fontSize: 14, fontWeight: "600" },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    summaryLabel: { fontSize: 13 },
    summaryValue: { fontSize: 13, fontWeight: "600" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 4 },
    totalLabel: { fontSize: 16, fontWeight: "700" },
    totalValue: { fontSize: 16, fontWeight: "700" },
});

export default OrderDetailsScreen;
