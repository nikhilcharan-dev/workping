import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import { useTheme } from "@/theme";

const PlaceholderScreen = ({ route }) => {
    const { colors } = useTheme();
    const title = route?.params?.title || "Coming Soon";

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Ionicons name="construct-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    This screen is under construction. Check back soon for updates.
                </Text>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        marginTop: 16,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        paddingHorizontal: 32,
    },
});

export default PlaceholderScreen;
