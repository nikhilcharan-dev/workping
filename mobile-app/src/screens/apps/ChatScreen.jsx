import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import Header from "@/components/layout/Header";
import Avatar from "@/components/Avatar";

const contacts = [
    { id: "1", name: "Gaston Lapierre", lastMessage: "Hey, how are you?", time: "2:30 PM", unread: 3, online: true },
    { id: "2", name: "Sarah Wilson", lastMessage: "Meeting at 3?", time: "1:15 PM", unread: 0, online: true },
    { id: "3", name: "Mike Johnson", lastMessage: "The report is ready", time: "12:45 PM", unread: 1, online: false },
    { id: "4", name: "Emma Davis", lastMessage: "Thanks for your help!", time: "11:30 AM", unread: 0, online: true },
    { id: "5", name: "Alex Brown", lastMessage: "See you tomorrow", time: "Yesterday", unread: 0, online: false },
    { id: "6", name: "Jessica Lee", lastMessage: "Great work on that!", time: "Yesterday", unread: 0, online: false },
];

const messages = [
    { id: "1", text: "Hey! How are you doing?", sender: "other", time: "2:25 PM" },
    { id: "2", text: "I'm doing great, thanks for asking! How about you?", sender: "me", time: "2:26 PM" },
    { id: "3", text: "Pretty good! Working on the new project", sender: "other", time: "2:27 PM" },
    { id: "4", text: "That sounds interesting. What's it about?", sender: "me", time: "2:28 PM" },
    {
        id: "5",
        text: "A mobile app for dashboard management. Really exciting stuff!",
        sender: "other",
        time: "2:30 PM",
    },
];

const ChatScreen = () => {
    const { colors } = useTheme();
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageText, setMessageText] = useState("");

    if (!selectedChat) {
        return (
            <View style={[styles.container, { backgroundColor: colors.bodyBg }]}>
                <Header title="Chat" />
                <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.contactRow, { borderBottomColor: colors.border }]}
                            onPress={() => setSelectedChat(item)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.avatarWrap}>
                                <Avatar name={item.name} size={44} variant="primary" />
                                {item.online && <View style={[styles.onlineDot, { borderColor: colors.cardBg }]} />}
                            </View>
                            <View style={styles.contactInfo}>
                                <View style={styles.contactHeader}>
                                    <Text style={[styles.contactName, { color: colors.textPrimary }]}>{item.name}</Text>
                                    <Text style={[styles.contactTime, { color: colors.textMuted }]}>{item.time}</Text>
                                </View>
                                <View style={styles.contactFooter}>
                                    <Text style={[styles.lastMsg, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {item.lastMessage}
                                    </Text>
                                    {item.unread > 0 && (
                                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.unreadText}>{item.unread}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bodyBg }]}>
            {/* Chat Header */}
            <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.topbarBg }}>
                <View
                    style={[styles.chatHeader, { backgroundColor: colors.topbarBg, borderBottomColor: colors.border }]}
                >
                    <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.topbarText} />
                    </TouchableOpacity>
                    <Avatar name={selectedChat.name} size={36} variant="primary" />
                    <View style={styles.chatHeaderInfo}>
                        <Text style={[styles.chatHeaderName, { color: colors.topbarText }]}>{selectedChat.name}</Text>
                        <Text
                            style={[
                                styles.chatHeaderStatus,
                                { color: selectedChat.online ? colors.success : colors.textMuted },
                            ]}
                        >
                            {selectedChat.online ? "Online" : "Offline"}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* Messages */}
            <FlatList
                data={[...messages].reverse()}
                inverted
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContent}
                renderItem={({ item }) => (
                    <View
                        style={[
                            styles.messageBubble,
                            item.sender === "me"
                                ? [styles.myMessage, { backgroundColor: colors.primary }]
                                : [styles.otherMessage, { backgroundColor: colors.cardBg }],
                        ]}
                    >
                        <Text
                            style={[styles.messageText, { color: item.sender === "me" ? "#fff" : colors.textPrimary }]}
                        >
                            {item.text}
                        </Text>
                        <Text
                            style={[
                                styles.messageTime,
                                { color: item.sender === "me" ? "rgba(255,255,255,0.7)" : colors.textMuted },
                            ]}
                        >
                            {item.time}
                        </Text>
                    </View>
                )}
            />

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <SafeAreaView edges={["bottom"]}>
                    <View style={[styles.inputRow, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
                        <TextInput
                            style={[
                                styles.messageInput,
                                {
                                    backgroundColor: colors.inputBg,
                                    color: colors.inputText,
                                    borderColor: colors.inputBorder,
                                },
                            ]}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.inputPlaceholder}
                            value={messageText}
                            onChangeText={setMessageText}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                if (messageText.trim()) {
                                    setMessageText("");
                                }
                            }}
                        >
                            <Ionicons name="send" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingBottom: 20 },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    avatarWrap: { position: "relative", marginRight: 12 },
    onlineDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#22c55e",
        borderWidth: 2,
    },
    contactInfo: { flex: 1 },
    contactHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    contactName: { fontSize: 14, fontWeight: "600" },
    contactTime: { fontSize: 11 },
    contactFooter: { flexDirection: "row", alignItems: "center" },
    lastMsg: { fontSize: 13, flex: 1 },
    unreadBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
    unreadText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    chatHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        height: 56,
        borderBottomWidth: 1,
    },
    backBtn: { padding: 6, marginRight: 8 },
    chatHeaderInfo: { marginLeft: 10, flex: 1 },
    chatHeaderName: { fontSize: 15, fontWeight: "600" },
    chatHeaderStatus: { fontSize: 11 },
    messagesContent: { padding: 16 },
    messageBubble: {
        maxWidth: "80%",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    myMessage: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
    otherMessage: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
    messageText: { fontSize: 14 },
    messageTime: { fontSize: 10, marginTop: 4, textAlign: "right" },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 14,
        marginRight: 8,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default ChatScreen;
