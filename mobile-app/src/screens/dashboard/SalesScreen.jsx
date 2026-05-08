import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const stats = [
    {
        icon: "iconamoon:shopping-card-duotone",
        name: "Total Sales",
        amount: "$24,568",
        change: "+8.2%",
        variant: "primary",
    },
    { icon: "iconamoon:delivery-duotone", name: "Total Orders", amount: "1,856", change: "+5.4%", variant: "success" },
    {
        icon: "iconamoon:profile-circle-duotone",
        name: "New Customers",
        amount: "524",
        change: "+12.1%",
        variant: "warning",
    },
    { icon: "iconamoon:arrow-up-duotone", name: "Growth Rate", amount: "18.2%", change: "+2.3%", variant: "info" },
];

const recentOrders = [
    { id: "#ORD-001", customer: "John Smith", amount: "$245", status: "Completed" },
    { id: "#ORD-002", customer: "Sarah Wilson", amount: "$180", status: "Pending" },
    { id: "#ORD-003", customer: "Mike Johnson", amount: "$320", status: "Completed" },
    { id: "#ORD-004", customer: "Emma Davis", amount: "$95", status: "Cancelled" },
    { id: "#ORD-005", customer: "Alex Brown", amount: "$410", status: "Completed" },
];

const screenWidth = Dimensions.get("window").width;

const SalesScreen = () => {
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

    const overviewData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{ data: [4200, 5800, 5200, 6800, 6200, 7500] }],
    };

    const categoryData = [
        {
            name: "Electronics",
            population: 35,
            color: "#3762ea",
            legendFontColor: colors.textPrimary,
            legendFontSize: 12,
        },
        { name: "Fashion", population: 25, color: "#22c55e", legendFontColor: colors.textPrimary, legendFontSize: 12 },
        { name: "Grocery", population: 20, color: "#f97316", legendFontColor: colors.textPrimary, legendFontSize: 12 },
        { name: "Others", population: 20, color: "#8b5cf6", legendFontColor: colors.textPrimary, legendFontSize: 12 },
    ];

    const variantColors = {
        primary: colors.primary,
        success: colors.success,
        warning: colors.warning,
        info: colors.info,
    };

    const statusColors = {
        Completed: "success",
        Pending: "warning",
        Cancelled: "danger",
    };

    return (
        <ScreenWrapper>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Sales</Text>
            <Text style={[styles.breadcrumb, { color: colors.textSecondary }]}>Dashboards / Sales</Text>

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
                        <Text style={[styles.statChange, { color: colors.success }]}>{stat.change}</Text>
                    </View>
                ))}
            </View>

            {/* Overview Chart */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sales Overview</Text>
                </Card.Header>
                <Card.Body>
                    <BarChart
                        data={overviewData}
                        width={screenWidth - 72}
                        height={220}
                        chartConfig={chartConfig}
                        style={styles.chart}
                        fromZero
                    />
                </Card.Body>
            </Card>

            {/* Sales by Category */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sales by Category</Text>
                </Card.Header>
                <Card.Body>
                    <PieChart
                        data={categoryData}
                        width={screenWidth - 72}
                        height={180}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="0"
                    />
                </Card.Body>
            </Card>

            {/* Recent Orders */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Orders</Text>
                </Card.Header>
                <Card.Body>
                    {recentOrders.map((order, idx) => (
                        <View key={idx} style={[styles.orderRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.orderInfo}>
                                <Text style={[styles.orderId, { color: colors.primary }]}>{order.id}</Text>
                                <Text style={[styles.orderCustomer, { color: colors.textSecondary }]}>
                                    {order.customer}
                                </Text>
                            </View>
                            <Text style={[styles.orderAmount, { color: colors.textPrimary }]}>{order.amount}</Text>
                            <Badge variant={statusColors[order.status]} soft>
                                {order.status}
                            </Badge>
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
    statCard: { borderRadius: 8, padding: 14, borderWidth: 1, width: "47%", flexGrow: 1 },
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
    orderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
    orderInfo: { flex: 1 },
    orderId: { fontSize: 13, fontWeight: "600" },
    orderCustomer: { fontSize: 12, marginTop: 2 },
    orderAmount: { fontSize: 14, fontWeight: "600", marginRight: 8 },
});

export default SalesScreen;
