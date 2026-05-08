import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const product = {
    name: "Wireless Headphones Pro",
    price: "$59.99",
    originalPrice: "$79.99",
    category: "Electronics",
    sku: "WH-PRO-001",
    stock: 142,
    status: "Active",
    rating: 4.5,
    reviews: 234,
    description:
        "Premium wireless headphones with active noise cancellation, 30-hour battery life, and comfortable over-ear design.",
    specs: [
        { label: "Brand", value: "AudioTech" },
        { label: "Color", value: "Matte Black" },
        { label: "Weight", value: "250g" },
        { label: "Battery", value: "30 hours" },
        { label: "Connectivity", value: "Bluetooth 5.3" },
    ],
};

const ProductDetailsScreen = ({ navigation, route }) => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={[styles.imageContainer, { backgroundColor: colors.primary + "10" }]}>
                    <Ionicons name="cube-outline" size={80} color={colors.primary} />
                </View>

                <Card style={styles.section}>
                    <Card.Body>
                        <View style={styles.titleRow}>
                            <Text style={[styles.productName, { color: colors.textPrimary }]}>{product.name}</Text>
                            <Badge variant="success" soft>
                                {product.status}
                            </Badge>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={[styles.price, { color: colors.primary }]}>{product.price}</Text>
                            <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>
                                {product.originalPrice}
                            </Text>
                        </View>
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                    key={star}
                                    name={
                                        star <= Math.floor(product.rating)
                                            ? "star"
                                            : star - 0.5 <= product.rating
                                              ? "star-half"
                                              : "star-outline"
                                    }
                                    size={16}
                                    color="#f5a623"
                                />
                            ))}
                            <Text style={[styles.reviewText, { color: colors.textSecondary }]}>
                                ({product.reviews} reviews)
                            </Text>
                        </View>
                    </Card.Body>
                </Card>

                <Card style={styles.section}>
                    <Card.Header>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
                    </Card.Header>
                    <Card.Body>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>{product.description}</Text>
                    </Card.Body>
                </Card>

                <Card style={styles.section}>
                    <Card.Header>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Specifications</Text>
                    </Card.Header>
                    <Card.Body>
                        {product.specs.map((spec, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.specRow,
                                    i < product.specs.length - 1 && {
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{spec.label}</Text>
                                <Text style={[styles.specValue, { color: colors.textPrimary }]}>{spec.value}</Text>
                            </View>
                        ))}
                    </Card.Body>
                </Card>

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                        <Ionicons name="pencil" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Edit Product</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.danger || "#dc3545" }]}>
                        <Ionicons name="trash" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    imageContainer: { height: 200, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    section: { marginBottom: 12 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    productName: { fontSize: 18, fontWeight: "700", flex: 1, marginRight: 8 },
    priceRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    price: { fontSize: 22, fontWeight: "700" },
    oldPrice: { fontSize: 14, textDecorationLine: "line-through", marginLeft: 8 },
    ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 2 },
    reviewText: { fontSize: 12, marginLeft: 6 },
    sectionTitle: { fontSize: 16, fontWeight: "600" },
    description: { fontSize: 14, lineHeight: 22 },
    specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
    specLabel: { fontSize: 13 },
    specValue: { fontSize: 13, fontWeight: "600" },
    actions: { flexDirection: "row", gap: 12, marginTop: 4 },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

export default ProductDetailsScreen;
