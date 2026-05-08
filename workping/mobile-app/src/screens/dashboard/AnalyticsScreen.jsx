import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import { useTheme } from "@/theme";

const stateData = [
    { icon: "iconamoon:eye-duotone", name: "Page View", amount: "13,647", variant: "primary" },
    { icon: "iconamoon:link-external-duotone", name: "Clicks", amount: "9,526", variant: "success" },
    { icon: "iconamoon:trend-up-bold", name: "Conversions", amount: "65.2%", variant: "danger" },
    { icon: "iconamoon:profile-circle-duotone", name: "New Users", amount: "9.5k", variant: "warning" },
];

const countries = [
    { name: "United States", value: 82.5, amount: 659, variant: "secondary" },
    { name: "Russia", value: 70.5, amount: 485, variant: "info" },
    { name: "China", value: 65.8, amount: 355, variant: "warning" },
    { name: "Canada", value: 55.8, amount: 204, variant: "success" },
    { name: "Brazil", value: 35.9, amount: 109, variant: "primary" },
];

const browsers = [
    { name: "Chrome", percentage: 62.5, amount: 5.06 },
    { name: "Firefox", percentage: 12.3, amount: 1.5 },
    { name: "Safari", percentage: 9.86, amount: 1.03 },
    { name: "Brave", percentage: 3.15, amount: 0.3 },
    { name: "Opera", percentage: 3.01, amount: 1.58 },
    { name: "Other", percentage: 6.38, amount: 3.6 },
];

const pagesList = [
    { path: "/dashboard/analytics", views: 4265, time: "09m:45s", rate: "20.4", variant: "danger" },
    { path: "/apps/chat", views: 2584, time: "05m:02s", rate: "12.25", variant: "warning" },
    { path: "/auth/sign-in", views: 3369, time: "04m:25s", rate: "5.2", variant: "success" },
    { path: "/apps/email", views: 985, time: "02m:03s", rate: "64.2", variant: "danger" },
    { path: "/apps/social", views: 653, time: "15m:56s", rate: "2.4", variant: "success" },
];

const screenWidth = Dimensions.get("window").width;

const StatCard = ({ name, amount, icon, variant }) => {
    const { colors } = useTheme();
    const variantColors = {
        primary: colors.primary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
        info: colors.info,
        secondary: colors.secondary,
    };
    const color = variantColors[variant] || colors.primary;

    return (
        <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
                <Icon icon={icon} size={24} color={color} />
            </View>
            <View style={styles.statText}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{name}</Text>
                <Text style={[styles.statAmount, { color: colors.textPrimary }]}>{amount}</Text>
            </View>
        </View>
    );
};

const ProgressRow = ({ label, value, amount, color }) => {
    const { colors } = useTheme();
    return (
        <View style={styles.progressRow}>
            <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>{label}</Text>
                <Text style={[styles.progressAmount, { color: colors.textSecondary }]}>{amount}k</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
};

const AnalyticsScreen = () => {
    const { colors } = useTheme();

    const chartConfig = {
        backgroundColor: colors.cardBg,
        backgroundGradientFrom: colors.cardBg,
        backgroundGradientTo: colors.cardBg,
        decimalCount: 0,
        color: (opacity = 1) => `rgba(55, 98, 234, ${opacity})`,
        labelColor: () => colors.textSecondary,
        propsForBackgroundLines: {
            strokeDasharray: "3 3",
            stroke: colors.border,
        },
    };

    const performanceData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
            {
                data: [34, 65, 46, 68, 49, 61, 42, 44, 78, 52, 63, 67],
                color: (opacity = 1) => `rgba(127, 86, 218, ${opacity})`,
                strokeWidth: 2,
            },
            {
                data: [8, 12, 7, 17, 21, 11, 5, 9, 7, 29, 12, 35],
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                strokeWidth: 2,
            },
        ],
        legend: ["Page Views", "Clicks"],
    };

    const browserPieData = browsers.map((b, idx) => ({
        name: b.name,
        population: b.percentage,
        color: ["#3762ea", "#f97316", "#06b6d4", "#8b5cf6", "#ef4444", "#a3a3a3"][idx],
        legendFontColor: colors.textPrimary,
        legendFontSize: 12,
    }));

    const variantMap = {
        secondary: colors.secondary,
        info: colors.info,
        warning: colors.warning,
        success: colors.success,
        primary: colors.primary,
    };

    return (
        <ScreenWrapper>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Analytics</Text>
            <Text style={[styles.breadcrumb, { color: colors.textSecondary }]}>Dashboards / Analytics</Text>

            {/* Stats */}
            <View style={styles.statsGrid}>
                {stateData.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </View>

            {/* Performance Chart */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Performance</Text>
                </Card.Header>
                <Card.Body>
                    <View style={styles.conversionRow}>
                        <View style={styles.conversionStat}>
                            <Text style={[styles.convSmall, { color: colors.textSecondary }]}>This Week</Text>
                            <Text style={[styles.convLarge, { color: colors.textPrimary }]}>23.5k</Text>
                        </View>
                        <View style={styles.conversionStat}>
                            <Text style={[styles.convSmall, { color: colors.textSecondary }]}>Last Week</Text>
                            <Text style={[styles.convLarge, { color: colors.textPrimary }]}>41.05k</Text>
                        </View>
                    </View>
                    <LineChart
                        data={performanceData}
                        width={screenWidth - 72}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                    />
                </Card.Body>
            </Card>

            {/* Sessions by Country */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sessions by Country</Text>
                </Card.Header>
                <Card.Body>
                    {countries.map((c, idx) => (
                        <ProgressRow
                            key={idx}
                            label={c.name}
                            value={c.value}
                            amount={c.amount}
                            color={variantMap[c.variant] || colors.primary}
                        />
                    ))}
                </Card.Body>
            </Card>

            {/* Session by Browser */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Session by Browser</Text>
                </Card.Header>
                <Card.Body>
                    <PieChart
                        data={browserPieData}
                        width={screenWidth - 72}
                        height={180}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="0"
                    />
                </Card.Body>
            </Card>

            {/* Top Pages */}
            <Card>
                <Card.Header>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Top Pages</Text>
                </Card.Header>
                <Card.Body>
                    {/* Table header */}
                    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.tableHead, { color: colors.textSecondary, flex: 2 }]}>Page Path</Text>
                        <Text style={[styles.tableHead, { color: colors.textSecondary }]}>Views</Text>
                        <Text style={[styles.tableHead, { color: colors.textSecondary }]}>Time</Text>
                        <Text style={[styles.tableHead, { color: colors.textSecondary }]}>Rate</Text>
                    </View>
                    {pagesList.map((page, idx) => {
                        const rateColor =
                            page.variant === "success"
                                ? colors.success
                                : page.variant === "danger"
                                  ? colors.danger
                                  : colors.warning;
                        return (
                            <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                                <Text
                                    style={[styles.tableCell, { color: colors.textSecondary, flex: 2 }]}
                                    numberOfLines={1}
                                >
                                    {page.path}
                                </Text>
                                <Text style={[styles.tableCell, { color: colors.textPrimary }]}>{page.views}</Text>
                                <Text style={[styles.tableCell, { color: colors.textPrimary }]}>{page.time}</Text>
                                <View style={[styles.rateBadge, { backgroundColor: rateColor + "20" }]}>
                                    <Text style={[styles.rateText, { color: rateColor }]}>{page.rate}%</Text>
                                </View>
                            </View>
                        );
                    })}
                </Card.Body>
            </Card>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    pageTitle: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 2,
    },
    breadcrumb: {
        fontSize: 13,
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flexDirection: "row",
        alignItems: "center",
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
        marginRight: 12,
    },
    statText: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
    },
    statAmount: {
        fontSize: 18,
        fontWeight: "700",
        marginTop: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    conversionRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 16,
    },
    conversionStat: {
        alignItems: "center",
    },
    convSmall: {
        fontSize: 12,
        marginBottom: 4,
    },
    convLarge: {
        fontSize: 20,
        fontWeight: "700",
    },
    chart: {
        borderRadius: 8,
        marginLeft: -16,
    },
    progressRow: {
        marginBottom: 14,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 13,
    },
    progressAmount: {
        fontSize: 13,
        fontWeight: "600",
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: 6,
        borderRadius: 3,
    },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    tableHead: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        flex: 1,
    },
    tableCell: {
        fontSize: 13,
        flex: 1,
    },
    rateBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        flex: 1,
        alignItems: "center",
    },
    rateText: {
        fontSize: 12,
        fontWeight: "600",
    },
});

export default AnalyticsScreen;
