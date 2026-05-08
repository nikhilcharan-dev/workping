import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const invoice = {
    id: "INV-001",
    date: "January 15, 2024",
    dueDate: "February 15, 2024",
    status: "Paid",
    statusVariant: "success",
    from: { name: "Your Company", address: "123 Business Ave, Suite 100", city: "San Francisco, CA 94102" },
    to: { name: "Acme Corp", address: "456 Client Street", city: "New York, NY 10001" },
    items: [
        { description: "Web Development", hours: "40", rate: "$50.00", total: "$2,000.00" },
        { description: "UI/UX Design", hours: "10", rate: "$50.00", total: "$500.00" },
    ],
    subtotal: "$2,500.00",
    tax: "$0.00",
    total: "$2,500.00",
};

const InvoiceDetailsScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.titleRow}>
                    <Text style={[styles.invoiceId, { color: colors.textPrimary }]}>{invoice.id}</Text>
                    <Badge variant={invoice.statusVariant} soft>
                        {invoice.status}
                    </Badge>
                </View>
                <Text style={[styles.date, { color: colors.textSecondary }]}>Issued: {invoice.date}</Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>Due: {invoice.dueDate}</Text>

                <View style={styles.partyRow}>
                    <Card style={styles.partyCard}>
                        <Card.Body>
                            <Text style={[styles.partyLabel, { color: colors.textSecondary }]}>From</Text>
                            <Text style={[styles.partyName, { color: colors.textPrimary }]}>{invoice.from.name}</Text>
                            <Text style={[styles.partyAddress, { color: colors.textSecondary }]}>
                                {invoice.from.address}
                            </Text>
                            <Text style={[styles.partyAddress, { color: colors.textSecondary }]}>
                                {invoice.from.city}
                            </Text>
                        </Card.Body>
                    </Card>
                    <Card style={styles.partyCard}>
                        <Card.Body>
                            <Text style={[styles.partyLabel, { color: colors.textSecondary }]}>To</Text>
                            <Text style={[styles.partyName, { color: colors.textPrimary }]}>{invoice.to.name}</Text>
                            <Text style={[styles.partyAddress, { color: colors.textSecondary }]}>
                                {invoice.to.address}
                            </Text>
                            <Text style={[styles.partyAddress, { color: colors.textSecondary }]}>
                                {invoice.to.city}
                            </Text>
                        </Card.Body>
                    </Card>
                </View>

                <Card style={styles.section}>
                    <Card.Header>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Items</Text>
                    </Card.Header>
                    <Card.Body>
                        {invoice.items.map((item, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.itemRow,
                                    i < invoice.items.length - 1 && {
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border,
                                    },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemDesc, { color: colors.textPrimary }]}>
                                        {item.description}
                                    </Text>
                                    <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>
                                        {item.hours} hrs × {item.rate}
                                    </Text>
                                </View>
                                <Text style={[styles.itemTotal, { color: colors.textPrimary }]}>{item.total}</Text>
                            </View>
                        ))}
                    </Card.Body>
                </Card>

                <Card style={styles.section}>
                    <Card.Body>
                        <SummaryRow label="Subtotal" value={invoice.subtotal} colors={colors} />
                        <SummaryRow label="Tax" value={invoice.tax} colors={colors} />
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total</Text>
                            <Text style={[styles.totalValue, { color: colors.primary }]}>{invoice.total}</Text>
                        </View>
                    </Card.Body>
                </Card>

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                        <Ionicons name="download-outline" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Download PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success || "#22c55e" }]}>
                        <Ionicons name="send-outline" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const SummaryRow = ({ label, value, colors }) => (
    <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { padding: 16 },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    invoiceId: { fontSize: 20, fontWeight: "700" },
    date: { fontSize: 13, marginTop: 4 },
    partyRow: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 12 },
    partyCard: { flex: 1 },
    partyLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
    partyName: { fontSize: 14, fontWeight: "600" },
    partyAddress: { fontSize: 12, marginTop: 2 },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "600" },
    itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    itemDesc: { fontSize: 14, fontWeight: "600" },
    itemDetail: { fontSize: 12, marginTop: 2 },
    itemTotal: { fontSize: 14, fontWeight: "600" },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    summaryLabel: { fontSize: 13 },
    summaryValue: { fontSize: 13, fontWeight: "600" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 4 },
    totalLabel: { fontSize: 16, fontWeight: "700" },
    totalValue: { fontSize: 16, fontWeight: "700" },
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

export default InvoiceDetailsScreen;
