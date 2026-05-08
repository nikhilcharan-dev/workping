import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const products = [
    { id: "1", name: "Wireless Headphones", price: "$59.99", category: "Electronics", stock: 142, status: "Active" },
    { id: "2", name: "Running Shoes Pro", price: "$89.99", category: "Fashion", stock: 85, status: "Active" },
    { id: "3", name: "Organic Coffee Beans", price: "$24.99", category: "Grocery", stock: 230, status: "Active" },
    { id: "4", name: "Smartphone Case", price: "$14.99", category: "Accessories", stock: 0, status: "Out of Stock" },
    { id: "5", name: "USB-C Hub Adapter", price: "$39.99", category: "Electronics", stock: 56, status: "Active" },
    { id: "6", name: "Yoga Mat Premium", price: "$34.99", category: "Sports", stock: 78, status: "Active" },
];

const ProductsScreen = ({ navigation }) => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={styles.headerRow}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Products</Text>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={products}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                        activeOpacity={0.7}
                    >
                        <Card style={{ marginBottom: 8 }}>
                            <Card.Body>
                                <View style={styles.productRow}>
                                    <View style={[styles.productThumb, { backgroundColor: colors.primary + "15" }]}>
                                        <Ionicons name="cube-outline" size={24} color={colors.primary} />
                                    </View>
                                    <View style={styles.productInfo}>
                                        <Text style={[styles.productName, { color: colors.textPrimary }]}>
                                            {item.name}
                                        </Text>
                                        <Text style={[styles.productCategory, { color: colors.textSecondary }]}>
                                            {item.category}
                                        </Text>
                                    </View>
                                    <View style={styles.productMeta}>
                                        <Text style={[styles.productPrice, { color: colors.textPrimary }]}>
                                            {item.price}
                                        </Text>
                                        <Badge variant={item.stock > 0 ? "success" : "danger"} soft>
                                            {item.status}
                                        </Badge>
                                    </View>
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
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    pageTitle: { fontSize: 22, fontWeight: "700" },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    listContent: { padding: 16, paddingTop: 0 },
    productRow: { flexDirection: "row", alignItems: "center" },
    productThumb: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    productInfo: { flex: 1, marginLeft: 12 },
    productName: { fontSize: 14, fontWeight: "600" },
    productCategory: { fontSize: 12, marginTop: 2 },
    productMeta: { alignItems: "flex-end" },
    productPrice: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
});

export default ProductsScreen;
