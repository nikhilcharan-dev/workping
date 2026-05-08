import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const orders = [
    {
        id: "#ORD-2024-001",
        customer: "Sarah Johnson",
        date: "Jan 15, 2024",
        total: "$125.00",
        status: "Delivered",
        statusVariant: "success",
    },
    {
        id: "#ORD-2024-002",
        customer: "Michael Chen",
        date: "Jan 14, 2024",
        total: "$89.50",
        status: "Shipped",
        statusVariant: "info",
    },
    {
        id: "#ORD-2024-003",
        customer: "Emily Davis",
        date: "Jan 14, 2024",
        total: "$245.00",
        status: "Processing",
        statusVariant: "warning",
    },
    {
        id: "#ORD-2024-004",
        customer: "James Wilson",
        date: "Jan 13, 2024",
        total: "$67.80",
        status: "Pending",
        statusVariant: "secondary",
    },
    {
        id: "#ORD-2024-005",
        customer: "Lisa Anderson",
        date: "Jan 12, 2024",
        total: "$189.99",
        status: "Delivered",
        statusVariant: "success",
    },
    {
        id: "#ORD-2024-006",
        customer: "Robert Taylor",
        date: "Jan 11, 2024",
        total: "$54.25",
        status: "Cancelled",
        statusVariant: "danger",
    },
];

const OrdersScreen = ({ navigation }) => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={styles.headerRow}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Orders</Text>
            </View>
            <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate("OrderDetails", { orderId: item.id })}
                        activeOpacity={0.7}
                    >
                        <Card style={{ marginBottom: 8 }}>
                            <Card.Body>
                                <View style={styles.topRow}>
                                    <Text style={[styles.orderId, { color: colors.primary }]}>{item.id}</Text>
                                    <Badge variant={item.statusVariant} soft>
                                        {item.status}
                                    </Badge>
                                </View>
                                <View style={styles.detailRow}>
                                    <View>
                                        <Text style={[styles.customer, { color: colors.textPrimary }]}>
                                            {item.customer}
                                        </Text>
                                        <Text style={[styles.date, { color: colors.textSecondary }]}>{item.date}</Text>
                                    </View>
                                    <Text style={[styles.total, { color: colors.textPrimary }]}>{item.total}</Text>
                                </View>
                            </Card.Body>
                        </Card>
                    </TouchableOpacity>
                )}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    headerRow: { paddingHorizontal: 16, paddingVertical: 12 },
    pageTitle: { fontSize: 22, fontWeight: "700" },
    listContent: { padding: 16, paddingTop: 0 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    orderId: { fontSize: 13, fontWeight: "600" },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    customer: { fontSize: 14, fontWeight: "600" },
    date: { fontSize: 12, marginTop: 2 },
    total: { fontSize: 16, fontWeight: "700" },
});

export default OrdersScreen;
