import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import { useTheme } from "@/theme";

const contactInfo = [
    { icon: "mail-outline", label: "Email", value: "support@workping.com" },
    { icon: "logo-whatsapp", label: "WhatsApp", value: "+91 9951277583" },
    { icon: "location-outline", label: "Address", value: "Aditya University, Surampalem, AP" },
];

const ContactUsScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <View style={styles.container}>
                    <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Contact Us</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>We'd love to hear from you</Text>

                    <Card style={styles.section}>
                        <Card.Body>
                            {contactInfo.map((item, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.infoRow,
                                        i < contactInfo.length - 1 && {
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.border,
                                        },
                                    ]}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                                        <Ionicons name={item.icon} size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.infoTextContainer}>
                                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                                            {item.label}
                                        </Text>
                                        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                                            {item.value}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </Card.Body>
                    </Card>

                    <Card style={styles.section}>
                        <Card.Header>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Send a Message</Text>
                        </Card.Header>
                        <Card.Body>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        borderColor: colors.border,
                                        color: colors.textPrimary,
                                        backgroundColor: colors.background,
                                    },
                                ]}
                                placeholder="Your Name"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        borderColor: colors.border,
                                        color: colors.textPrimary,
                                        backgroundColor: colors.background,
                                    },
                                ]}
                                placeholder="Email Address"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        borderColor: colors.border,
                                        color: colors.textPrimary,
                                        backgroundColor: colors.background,
                                    },
                                ]}
                                placeholder="Subject"
                                placeholderTextColor={colors.textSecondary}
                            />
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textarea,
                                    {
                                        borderColor: colors.border,
                                        color: colors.textPrimary,
                                        backgroundColor: colors.background,
                                    },
                                ]}
                                placeholder="Your Message"
                                placeholderTextColor={colors.textSecondary}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                                <Ionicons name="send" size={16} color="#fff" />
                                <Text style={styles.sendBtnText}>Send Message</Text>
                            </TouchableOpacity>
                        </Card.Body>
                    </Card>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    pageTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
    subtitle: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 20 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: "600" },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
    infoTextContainer: { flex: 1 },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    infoLabel: { fontSize: 11, textTransform: "uppercase", fontWeight: "600" },
    infoValue: { fontSize: 14, marginTop: 2 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 12,
    },
    textarea: { height: 100 },
    sendBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 8,
    },
    sendBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});

export default ContactUsScreen;
