import React from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";

const posts = [
    {
        id: "1",
        user: "Gaston Lapierre",
        time: "2 hours ago",
        content:
            "Just launched our new dashboard template! Really excited about the React Native mobile version. Check it out!",
        likes: 42,
        comments: 12,
        shares: 5,
    },
    {
        id: "2",
        user: "Sarah Wilson",
        time: "5 hours ago",
        content:
            "Great team meeting today. Looking forward to the upcoming sprint. Our productivity has increased by 30%! 🚀",
        likes: 28,
        comments: 8,
        shares: 2,
    },
    {
        id: "3",
        user: "Mike Johnson",
        time: "Yesterday",
        content: "Working on some new components for the design system. The new color palette looks amazing! 🎨",
        likes: 56,
        comments: 15,
        shares: 7,
    },
    {
        id: "4",
        user: "Emma Davis",
        time: "2 days ago",
        content: "Just completed the new authentication flow. Security-first approach with biometric integration.",
        likes: 35,
        comments: 10,
        shares: 3,
    },
];

const suggestedUsers = [
    { id: "1", name: "Jessica Lee", role: "UI Designer" },
    { id: "2", name: "Alex Brown", role: "Developer" },
    { id: "3", name: "Tom Harris", role: "Product Manager" },
];

const SocialScreen = () => {
    const { colors } = useTheme();

    const renderPost = ({ item }) => (
        <Card style={{ marginBottom: 12 }}>
            <Card.Body>
                <View style={styles.postHeader}>
                    <Avatar name={item.user} size={40} variant="primary" />
                    <View style={styles.postHeaderText}>
                        <Text style={[styles.postUser, { color: colors.textPrimary }]}>{item.user}</Text>
                        <Text style={[styles.postTime, { color: colors.textMuted }]}>{item.time}</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.postContent, { color: colors.textPrimary }]}>{item.content}</Text>

                <View style={[styles.postActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="heart-outline" size={18} color={colors.danger} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{item.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{item.comments}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="share-outline" size={18} color={colors.success} />
                        <Text style={[styles.actionText, { color: colors.textSecondary }]}>{item.shares}</Text>
                    </TouchableOpacity>
                </View>
            </Card.Body>
        </Card>
    );

    return (
        <ScreenWrapper>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Social Feed</Text>

            {/* Suggested Users */}
            <Card style={{ marginBottom: 16 }}>
                <Card.Header>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Suggested for you</Text>
                </Card.Header>
                <Card.Body>
                    <FlatList
                        horizontal
                        data={suggestedUsers}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={[styles.suggestedCard, { borderColor: colors.border }]}>
                                <Avatar name={item.name} size={48} variant="primary" />
                                <Text style={[styles.suggestedName, { color: colors.textPrimary }]}>{item.name}</Text>
                                <Text style={[styles.suggestedRole, { color: colors.textSecondary }]}>{item.role}</Text>
                                <TouchableOpacity style={[styles.followBtn, { borderColor: colors.primary }]}>
                                    <Text style={[styles.followText, { color: colors.primary }]}>Follow</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </Card.Body>
            </Card>

            {/* Posts */}
            {posts.map((post) => renderPost({ item: post }))}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    pageTitle: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
    sectionTitle: { fontSize: 15, fontWeight: "600" },
    postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    postHeaderText: { flex: 1, marginLeft: 10 },
    postUser: { fontSize: 14, fontWeight: "600" },
    postTime: { fontSize: 12 },
    postContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    postActions: {
        flexDirection: "row",
        borderTopWidth: 1,
        paddingTop: 12,
        gap: 24,
    },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    actionText: { fontSize: 13 },
    suggestedCard: {
        alignItems: "center",
        padding: 12,
        marginRight: 12,
        borderRadius: 8,
        borderWidth: 1,
        width: 120,
    },
    suggestedName: { fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 8 },
    suggestedRole: { fontSize: 11, textAlign: "center", marginTop: 2 },
    followBtn: { marginTop: 8, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 16 },
    followText: { fontSize: 12, fontWeight: "600" },
});

export default SocialScreen;
