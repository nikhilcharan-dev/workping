import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const inventory = [
    { id: "1", name: "Wireless Headphones", sku: "WH-001", stock: 142, threshold: 20, status: "In Stock" },
    { id: "2", name: "Running Shoes Pro", sku: "RS-002", stock: 85, threshold: 15, status: "In Stock" },
    { id: "3", name: "Organic Coffee Beans", sku: "CB-003", stock: 8, threshold: 50, status: "Low Stock" },
    { id: "4", name: "Smartphone Case", sku: "SC-004", stock: 0, threshold: 10, status: "Out of Stock" },
    { id: "5", name: "USB-C Hub Adapter", sku: "UH-005", stock: 56, threshold: 25, status: "In Stock" },
    { id: "6", name: "Yoga Mat Premium", sku: "YM-006", stock: 12, threshold: 20, status: "Low Stock" },
];

const getStockVariant = (status) => {
    if (status === "Out of Stock") return "danger";
    if (status === "Low Stock") return "warning";
    return "success";
};

const InventoryScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={styles.headerRow}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Inventory</Text>
            </View>
            <FlatList
                data={inventory}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Card style={{ marginBottom: 8 }}>
                        <Card.Body>
                            <View style={styles.topRow}>
                                <Text style={[styles.productName, { color: colors.textPrimary }]}>{item.name}</Text>
                                <Badge variant={getStockVariant(item.status)} soft>
                                    {item.status}
                                </Badge>
                            </View>
                            <Text style={[styles.sku, { color: colors.textSecondary }]}>SKU: {item.sku}</Text>
                            <View style={styles.stockRow}>
                                <View style={styles.stockItem}>
                                    <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
                                    <Text style={[styles.stockText, { color: colors.textSecondary }]}>
                                        Stock:{" "}
                                        <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                                            {item.stock}
                                        </Text>
                                    </Text>
                                </View>
                                <View style={styles.stockItem}>
                                    <Ionicons name="alert-circle-outline" size={14} color={colors.textSecondary} />
                                    <Text style={[styles.stockText, { color: colors.textSecondary }]}>
                                        Threshold: {item.threshold}
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
    headerRow: { paddingHorizontal: 16, paddingVertical: 12 },
    pageTitle: { fontSize: 22, fontWeight: "700" },
    listContent: { padding: 16, paddingTop: 0 },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    productName: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
    sku: { fontSize: 12, marginBottom: 8 },
    stockRow: { flexDirection: "row", justifyContent: "space-between" },
    stockItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    stockText: { fontSize: 12 },
});

export default InventoryScreen;
