import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import Header from "@/components/layout/Header";
import Avatar from "@/components/Avatar";

const emailData = [
    {
        id: "1",
        from: "Sarah Wilson",
        subject: "Project Update - Q4 Report",
        preview: "Hi, please find the updated quarterly report attached...",
        time: "2:30 PM",
        unread: true,
        starred: false,
    },
    {
        id: "2",
        from: "System Notification",
        subject: "Your subscription is expiring",
        preview: "Your premium subscription will expire in 3 days...",
        time: "1:15 PM",
        unread: true,
        starred: true,
    },
    {
        id: "3",
        from: "Mike Johnson",
        subject: "Meeting Rescheduled",
        preview: "The team meeting has been moved to Thursday at 3 PM...",
        time: "12:00 PM",
        unread: false,
        starred: false,
    },
    {
        id: "4",
        from: "HR Department",
        subject: "Holiday Calendar 2024",
        preview: "Please find the updated holiday calendar for 2024...",
        time: "11:30 AM",
        unread: false,
        starred: true,
    },
    {
        id: "5",
        from: "Design Team",
        subject: "New UI Mockups Ready",
        preview: "The new dashboard mockups are ready for review...",
        time: "Yesterday",
        unread: false,
        starred: false,
    },
    {
        id: "6",
        from: "Alex Brown",
        subject: "Invoice #1234",
        preview: "Please review the attached invoice for our services...",
        time: "Yesterday",
        unread: false,
        starred: false,
    },
    {
        id: "7",
        from: "Support Team",
        subject: "Ticket #5678 Resolved",
        preview: "Your support ticket has been resolved. If you have...",
        time: "2 days ago",
        unread: false,
        starred: false,
    },
];

const folders = ["Inbox", "Sent", "Drafts", "Starred", "Trash"];

const EmailScreen = () => {
    const { colors } = useTheme();
    const [activeFolder, setActiveFolder] = useState("Inbox");
    const [selectedEmail, setSelectedEmail] = useState(null);

    const filteredEmails = activeFolder === "Starred" ? emailData.filter((e) => e.starred) : emailData;

    if (selectedEmail) {
        return (
            <View style={[styles.container, { backgroundColor: colors.bodyBg }]}>
                <Header title="Email" />
                <View style={styles.emailDetail}>
                    <TouchableOpacity onPress={() => setSelectedEmail(null)} style={styles.backRow}>
                        <Ionicons name="arrow-back" size={20} color={colors.primary} />
                        <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
                    </TouchableOpacity>

                    <View style={[styles.emailCard, { backgroundColor: colors.cardBg }]}>
                        <Text style={[styles.emailSubject, { color: colors.textPrimary }]}>
                            {selectedEmail.subject}
                        </Text>
                        <View style={styles.emailMeta}>
                            <Avatar name={selectedEmail.from} size={36} variant="primary" />
                            <View style={styles.emailMetaText}>
                                <Text style={[styles.emailFrom, { color: colors.textPrimary }]}>
                                    {selectedEmail.from}
                                </Text>
                                <Text style={[styles.emailTime, { color: colors.textMuted }]}>
                                    {selectedEmail.time}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.emailBody, { color: colors.textSecondary }]}>
                            {selectedEmail.preview}
                            {"\n\n"}
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
                            labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
                            laboris.
                            {"\n\n"}
                            Best regards,{"\n"}
                            {selectedEmail.from}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bodyBg }]}>
            <Header title="Email" />

            {/* Folder Tabs */}
            <View style={[styles.folderRow, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                <FlatList
                    horizontal
                    data={folders}
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.folderContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.folderTab,
                                activeFolder === item && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                            ]}
                            onPress={() => setActiveFolder(item)}
                        >
                            <Text
                                style={[
                                    styles.folderText,
                                    { color: activeFolder === item ? colors.primary : colors.textSecondary },
                                ]}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Email List */}
            <FlatList
                data={filteredEmails}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.emailRow,
                            { borderBottomColor: colors.border },
                            item.unread && { backgroundColor: colors.primary + "08" },
                        ]}
                        onPress={() => setSelectedEmail(item)}
                        activeOpacity={0.7}
                    >
                        <Avatar name={item.from} size={40} variant="primary" />
                        <View style={styles.emailInfo}>
                            <View style={styles.emailHeader}>
                                <Text
                                    style={[
                                        styles.emailName,
                                        { color: colors.textPrimary },
                                        item.unread && styles.bold,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {item.from}
                                </Text>
                                <Text style={[styles.emailRowTime, { color: colors.textMuted }]}>{item.time}</Text>
                            </View>
                            <Text
                                style={[
                                    styles.emailRowSubject,
                                    { color: colors.textPrimary },
                                    item.unread && styles.bold,
                                ]}
                                numberOfLines={1}
                            >
                                {item.subject}
                            </Text>
                            <Text style={[styles.emailPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                                {item.preview}
                            </Text>
                        </View>
                        {item.starred && (
                            <Ionicons name="star" size={16} color={colors.warning} style={styles.starIcon} />
                        )}
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    folderRow: { borderBottomWidth: 1 },
    folderContent: { paddingHorizontal: 8 },
    folderTab: { paddingHorizontal: 14, paddingVertical: 12 },
    folderText: { fontSize: 13, fontWeight: "500" },
    listContent: { paddingBottom: 20 },
    emailRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    emailInfo: { flex: 1, marginLeft: 12 },
    emailHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    emailName: { fontSize: 13, flex: 1, marginRight: 8 },
    emailRowTime: { fontSize: 11 },
    emailRowSubject: { fontSize: 14, marginBottom: 2 },
    emailPreview: { fontSize: 12 },
    bold: { fontWeight: "700" },
    starIcon: { marginLeft: 8 },
    emailDetail: { flex: 1, padding: 16 },
    backRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    backText: { fontSize: 14, marginLeft: 6 },
    emailCard: { borderRadius: 8, padding: 16 },
    emailSubject: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
    emailMeta: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    emailMetaText: { marginLeft: 12 },
    emailFrom: { fontSize: 14, fontWeight: "600" },
    emailTime: { fontSize: 12, marginTop: 2 },
    emailBody: { fontSize: 14, lineHeight: 22 },
});

export default EmailScreen;
