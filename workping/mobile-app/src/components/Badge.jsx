import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { getVariantColor, getVariantSoftColor } from "@/theme/colors";

const Badge = ({ children, variant = "primary", soft = false, pill = false, style, textStyle }) => {
    const { colors, borderRadius: br } = useTheme();
    const bgColor = soft ? getVariantSoftColor(variant, colors) : getVariantColor(variant, colors);
    const txtColor = soft ? getVariantColor(variant, colors) : "#ffffff";

    return (
        <View style={[styles.badge, { backgroundColor: bgColor, borderRadius: pill ? br.pill : br.sm }, style]}>
            <Text style={[styles.text, { color: variant === "light" ? colors.textPrimary : txtColor }, textStyle]}>
                {children}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
    },
    text: {
        fontSize: 11,
        fontWeight: "600",
    },
});

export default Badge;
