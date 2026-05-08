import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import { useTheme } from "@/theme";

const stats = [
    {
        icon: "iconamoon:credit-card-duotone",
        name: "Revenue",
        amount: "$46,782",
        change: "+4.3%",
        variant: "primary",
        up: true,
    },
    {
        icon: "iconamoon:trend-up-bold",
        name: "Expenses",
        amount: "$16,389",
        change: "-2.1%",
        variant: "danger",
        up: false,
    },
    {
        icon: "iconamoon:shopping-bag-duotone",
        name: "Investments",
        amount: "$8,927",
        change: "+6.8%",
        variant: "success",
        up: true,
    },
    {
        icon: "iconamoon:star-duotone",
        name: "Savings",
        amount: "$21,466",
        change: "+1.5%",
        variant: "warning",
        up: true,
    },
];

const transactions = [
    { name: "Salary Deposit", amount: "+$5,200", type: "credit", date: "Jan 15, 2024" },
    { name: "Electric Bill", amount: "-$150", type: "debit", date: "Jan 14, 2024" },
    { name: "Freelance Payment", amount: "+$1,200", type: "credit", date: "Jan 13, 2024" },
    { name: "Grocery Store", amount: "-$89", type: "debit", date: "Jan 12, 2024" },
    { name: "Client Invoice", amount: "+$3,500", type: "credit", date: "Jan 11, 2024" },
];

const screenWidth = Dimensions.get("window").width;

const FinanceScreen = () => {
    const { colors } = useTheme();

    const chartConfig = {
        backgroundColor: colors.cardBg,
        backgroundGradientFrom: colors.cardBg,
        backgroundGradientTo: colors.cardBg,
        decimalCount: 0,
        color: (opacity = 1) => `rgba(55, 98, 234, ${opacity})`,
        labelColor: () => colors.textSecondary,
        propsForBackgroundLines: { strokeDasharray: "3 3", stroke: colors.border },
    };

    const revenueData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{ data: [3200, 4500, 3800, 5100, 4800, 6200] }],
    };

    const expenseData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{ data: [1200, 1800, 1400, 2100, 1700, 1900] }],
    };

    const variantColors = {
        primary: colors.primary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
    };

    return (
        <ScreenWrapper>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Finance</Text>
            <Text style={[styles.breadcrumb, { color: colors.textSecondary }]}>Dashboards / Finance</Text>

            {/* Stats */}
            <View style={styles.statsGrid}>
                {stats.map((stat, idx) => (
                    <View
                        key={idx}
                        style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                    >
                        <View
                            style={[
                                styles.statIcon,
                                { backgroundColor: (variantColors[stat.variant] || colors.primary) + "15" },
                            ]}
                        >
                            <Icon icon={stat.icon} size={24} color={variantColors[stat.variant]} />
                        </View>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.name}</Text>
                        <Text style={[styles.statAmount, { color: colors.textPrimary }]}>{stat.amount}</Text>
                        <Text style={[styles.statChange, { color: stat.up ? colors.success : colors.danger }]}>
                            {stat.change}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Revenue Chart */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Revenue</Text>
                </Card.Header>
                <Card.Body>
                    <BarChart
                        data={revenueData}
                        width={screenWidth - 72}
                        height={200}
                        chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(127, 86, 218, ${o})` }}
                        style={styles.chart}
                        fromZero
                    />
                </Card.Body>
            </Card>

            {/* Expenses Chart */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Expenses</Text>
                </Card.Header>
                <Card.Body>
                    <LineChart
                        data={expenseData}
                        width={screenWidth - 72}
                        height={200}
                        chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(239, 68, 68, ${o})` }}
                        bezier
                        style={styles.chart}
                    />
                </Card.Body>
            </Card>

            {/* Transactions */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>
                </Card.Header>
                <Card.Body>
                    {transactions.map((tx, idx) => (
                        <View key={idx} style={[styles.txRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.txInfo}>
                                <Text style={[styles.txName, { color: colors.textPrimary }]}>{tx.name}</Text>
                                <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                            </View>
                            <Text
                                style={[
                                    styles.txAmount,
                                    { color: tx.type === "credit" ? colors.success : colors.danger },
                                ]}
                            >
                                {tx.amount}
                            </Text>
                        </View>
                    ))}
                </Card.Body>
            </Card>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    pageTitle: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
    breadcrumb: { fontSize: 13, marginBottom: 16 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
    statCard: {
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        width: "47%",
        flexGrow: 1,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statLabel: { fontSize: 12, marginBottom: 2 },
    statAmount: { fontSize: 18, fontWeight: "700" },
    statChange: { fontSize: 12, fontWeight: "600", marginTop: 4 },
    cardTitle: { fontSize: 16, fontWeight: "600" },
    chart: { borderRadius: 8, marginLeft: -16 },
    txRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    txInfo: { flex: 1 },
    txName: { fontSize: 14, fontWeight: "500" },
    txDate: { fontSize: 12, marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: "600" },
});

export default FinanceScreen;
