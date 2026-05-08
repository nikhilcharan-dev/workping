import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "./Icon";
import { useTheme } from "@/theme";

const PageBreadcrumb = ({ title, subName }) => {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <View style={styles.breadcrumb}>
                <Text style={[styles.subName, { color: colors.primary }]}>{subName}</Text>
                <Icon icon="bx:chevron-right" size={14} color={colors.textMuted} />
                <Text style={[styles.active, { color: colors.textMuted }]}>{title}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
    },
    breadcrumb: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    subName: {
        fontSize: 13,
    },
    active: {
        fontSize: 13,
    },
});

export default PageBreadcrumb;
