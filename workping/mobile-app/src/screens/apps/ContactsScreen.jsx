import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";

const contactList = [
    { id: "1", name: "Gaston Lapierre", email: "gaston@example.com", phone: "+1 (555) 123-4567", role: "Admin" },
    { id: "2", name: "Sarah Wilson", email: "sarah.wilson@example.com", phone: "+1 (555) 234-5678", role: "Designer" },
    { id: "3", name: "Mike Johnson", email: "mike.j@example.com", phone: "+1 (555) 345-6789", role: "Developer" },
    { id: "4", name: "Emma Davis", email: "emma.d@example.com", phone: "+1 (555) 456-7890", role: "Manager" },
    { id: "5", name: "Alex Brown", email: "alex.brown@example.com", phone: "+1 (555) 567-8901", role: "Developer" },
    { id: "6", name: "Jessica Lee", email: "jessica.lee@example.com", phone: "+1 (555) 678-9012", role: "Designer" },
    {
        id: "7",
        name: "Tom Harris",
        email: "tom.harris@example.com",
        phone: "+1 (555) 789-0123",
        role: "Product Manager",
    },
    { id: "8", name: "Lisa Chen", email: "lisa.chen@example.com", phone: "+1 (555) 890-1234", role: "QA Engineer" },
];

const ContactsScreen = () => {
    const { colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = contactList.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={[styles.searchRow, { backgroundColor: colors.cardBg }]}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: colors.inputText }]}
                    placeholder="Search contacts..."
                    placeholderTextColor={colors.inputPlaceholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View
                        style={[
                            styles.contactRow,
                            { backgroundColor: colors.cardBg, borderBottomColor: colors.border },
                        ]}
                    >
                        <Avatar name={item.name} size={44} variant="primary" />
                        <View style={styles.contactInfo}>
                            <Text style={[styles.contactName, { color: colors.textPrimary }]}>{item.name}</Text>
                            <Text style={[styles.contactRole, { color: colors.textSecondary }]}>{item.role}</Text>
                            <Text style={[styles.contactEmail, { color: colors.textMuted }]}>{item.email}</Text>
                        </View>
                        <View style={styles.contactActions}>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary + "15" }]}>
                                <Ionicons name="call-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.success + "15" }]}>
                                <Ionicons name="mail-outline" size={16} color={colors.success} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts found</Text>
                }
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    searchInput: { flex: 1, fontSize: 14, marginLeft: 8 },
    listContent: { paddingBottom: 20 },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    contactInfo: { flex: 1, marginLeft: 12 },
    contactName: { fontSize: 14, fontWeight: "600" },
    contactRole: { fontSize: 12, marginTop: 2 },
    contactEmail: { fontSize: 11, marginTop: 2 },
    contactActions: { flexDirection: "row", gap: 8 },
    contactBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: { textAlign: "center", fontSize: 14, paddingVertical: 40 },
});

export default ContactsScreen;
