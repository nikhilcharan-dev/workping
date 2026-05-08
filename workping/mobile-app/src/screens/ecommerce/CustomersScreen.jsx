import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const customers = [
    { id: "1", name: "Sarah Johnson", email: "sarah@example.com", orders: 24, spent: "$1,240", status: "Active" },
    { id: "2", name: "Michael Chen", email: "michael@example.com", orders: 18, spent: "$890", status: "Active" },
    { id: "3", name: "Emily Davis", email: "emily@example.com", orders: 12, spent: "$560", status: "Active" },
    { id: "4", name: "James Wilson", email: "james@example.com", orders: 5, spent: "$230", status: "Inactive" },
    { id: "5", name: "Lisa Anderson", email: "lisa@example.com", orders: 31, spent: "$2,100", status: "Active" },
    { id: "6", name: "Robert Taylor", email: "robert@example.com", orders: 8, spent: "$420", status: "Active" },
];

const CustomersScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={styles.headerRow}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Customers</Text>
                <Text style={[styles.count, { color: colors.textSecondary }]}>{customers.length} total</Text>
            </View>
            <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Card style={{ marginBottom: 8 }}>
                        <Card.Body>
                            <View style={styles.row}>
                                <Avatar name={item.name} size={40} />
                                <View style={styles.info}>
                                    <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                                    <Text style={[styles.email, { color: colors.textSecondary }]}>{item.email}</Text>
                                </View>
                                <View style={styles.meta}>
                                    <Text style={[styles.spent, { color: colors.textPrimary }]}>{item.spent}</Text>
                                    <Text style={[styles.orders, { color: colors.textSecondary }]}>
                                        {item.orders} orders
                                    </Text>
                                </View>
                            </View>
                        </Card.Body>
                    </Card>
                )}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    pageTitle: { fontSize: 22, fontWeight: "700" },
    count: { fontSize: 13 },
    listContent: { padding: 16, paddingTop: 0 },
    row: { flexDirection: "row", alignItems: "center" },
    info: { flex: 1, marginLeft: 12 },
    name: { fontSize: 14, fontWeight: "600" },
    email: { fontSize: 12, marginTop: 2 },
    meta: { alignItems: "flex-end" },
    spent: { fontSize: 14, fontWeight: "700" },
    orders: { fontSize: 11, marginTop: 2 },
});

export default CustomersScreen;
