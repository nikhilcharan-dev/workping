import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import { useTheme } from "@/theme";

const initialEvents = [
    { id: "1", title: "Team Standup", time: "9:00 AM - 9:30 AM", date: "Today", category: "Meeting", color: "#3762ea" },
    {
        id: "2",
        title: "Design Review",
        time: "11:00 AM - 12:00 PM",
        date: "Today",
        category: "Review",
        color: "#f5a623",
    },
    { id: "3", title: "Client Call", time: "2:00 PM - 3:00 PM", date: "Today", category: "Call", color: "#22c55e" },
    {
        id: "4",
        title: "Sprint Planning",
        time: "10:00 AM - 11:30 AM",
        date: "Tomorrow",
        category: "Meeting",
        color: "#3762ea",
    },
    {
        id: "5",
        title: "Code Review",
        time: "1:00 PM - 2:00 PM",
        date: "Tomorrow",
        category: "Review",
        color: "#f5a623",
    },
    {
        id: "6",
        title: "Product Demo",
        time: "3:00 PM - 4:00 PM",
        date: "Jan 20",
        category: "Presentation",
        color: "#8b5cf6",
    },
    {
        id: "7",
        title: "Lunch with Team",
        time: "12:30 PM - 1:30 PM",
        date: "Jan 21",
        category: "Social",
        color: "#ec4899",
    },
];

const ScheduleScreen = () => {
    const { colors } = useTheme();
    const [filter, setFilter] = useState("All");
    const categories = ["All", "Meeting", "Review", "Call", "Presentation", "Social"];

    const filtered = filter === "All" ? initialEvents : initialEvents.filter((e) => e.category === filter);
    const grouped = filtered.reduce((acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
    }, {});

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Schedule</Text>

                <View style={styles.filterRow}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setFilter(cat)}
                            style={[
                                styles.filterChip,
                                { backgroundColor: filter === cat ? colors.primary : colors.cardBg || colors.surface },
                            ]}
                        >
                            <Text
                                style={[styles.filterText, { color: filter === cat ? "#fff" : colors.textSecondary }]}
                            >
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {Object.entries(grouped).map(([date, events]) => (
                    <View key={date} style={styles.group}>
                        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{date}</Text>
                        {events.map((event) => (
                            <Card key={event.id} style={{ marginBottom: 8 }}>
                                <Card.Body>
                                    <View style={styles.eventRow}>
                                        <View style={[styles.colorBar, { backgroundColor: event.color }]} />
                                        <View style={styles.eventInfo}>
                                            <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
                                                {event.title}
                                            </Text>
                                            <View style={styles.eventMeta}>
                                                <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                                                <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                                                    {event.time}
                                                </Text>
                                            </View>
                                        </View>
                                        <Badge variant="primary" soft>
                                            {event.category}
                                        </Badge>
                                    </View>
                                </Card.Body>
                            </Card>
                        ))}
                    </View>
                ))}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    pageTitle: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
    filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    filterText: { fontSize: 12, fontWeight: "600" },
    group: { marginBottom: 16 },
    groupTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
    eventRow: { flexDirection: "row", alignItems: "center" },
    colorBar: { width: 4, height: 40, borderRadius: 2 },
    eventInfo: { flex: 1, marginLeft: 12 },
    eventTitle: { fontSize: 14, fontWeight: "600" },
    eventMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    eventTime: { fontSize: 12 },
});

export default ScheduleScreen;
