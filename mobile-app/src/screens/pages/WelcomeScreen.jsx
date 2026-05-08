import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import LogoBox from "@/components/LogoBox";

const WelcomeScreen = ({ navigation }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LogoBox />
            <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to WorkPing</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your all-in-one admin dashboard for managing everything in one place.
            </Text>
            <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate("Main", { screen: "Dashboard" })}
            >
                <Text style={styles.btnText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    title: { fontSize: 26, fontWeight: "700", marginTop: 24, textAlign: "center" },
    subtitle: { fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22 },
    btn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 32,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 10,
    },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

export default WelcomeScreen;
