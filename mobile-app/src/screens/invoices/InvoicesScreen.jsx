import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const invoices = [
    {
        id: "INV-001",
        client: "Acme Corp",
        date: "Jan 15, 2024",
        amount: "$2,500.00",
        status: "Paid",
        variant: "success",
    },
    {
        id: "INV-002",
        client: "Globex Inc",
        date: "Jan 12, 2024",
        amount: "$4,200.00",
        status: "Pending",
        variant: "warning",
    },
    {
        id: "INV-003",
        client: "Wayne Enterprises",
        date: "Jan 10, 2024",
        amount: "$1,800.00",
        status: "Paid",
        variant: "success",
    },
    {
        id: "INV-004",
        client: "Stark Industries",
        date: "Jan 8, 2024",
        amount: "$6,350.00",
        status: "Overdue",
        variant: "danger",
    },
    {
        id: "INV-005",
        client: "Umbrella Corp",
        date: "Jan 5, 2024",
        amount: "$950.00",
        status: "Paid",
        variant: "success",
    },
    {
        id: "INV-006",
        client: "Cyberdyne Systems",
        date: "Jan 3, 2024",
        amount: "$3,100.00",
        status: "Pending",
        variant: "warning",
    },
];

const InvoicesScreen = ({ navigation }) => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={styles.headerRow}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Invoices</Text>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>New</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={invoices}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate("InvoiceDetails", { invoiceId: item.id })}
                        activeOpacity={0.7}
                    >
                        <Card style={{ marginBottom: 8 }}>
                            <Card.Body>
                                <View style={styles.topRow}>
                                    <Text style={[styles.invoiceId, { color: colors.primary }]}>{item.id}</Text>
                                    <Badge variant={item.variant} soft>
                                        {item.status}
                                    </Badge>
                                </View>
                                <View style={styles.detailRow}>
                                    <View>
                                        <Text style={[styles.client, { color: colors.textPrimary }]}>
                                            {item.client}
                                        </Text>
                                        <Text style={[styles.date, { color: colors.textSecondary }]}>{item.date}</Text>
                                    </View>
                                    <Text style={[styles.amount, { color: colors.textPrimary }]}>{item.amount}</Text>
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
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    invoiceId: { fontSize: 13, fontWeight: "600" },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    client: { fontSize: 14, fontWeight: "600" },
    date: { fontSize: 12, marginTop: 2 },
    amount: { fontSize: 16, fontWeight: "700" },
});

export default InvoicesScreen;
