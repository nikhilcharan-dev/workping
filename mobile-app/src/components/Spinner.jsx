import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { getVariantColor } from "@/theme/colors";

const Spinner = ({ color = "primary", size = "small", style }) => {
    const { colors } = useTheme();
    const spinnerColor = getVariantColor(color, colors);

    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={spinnerColor} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
});

export default Spinner;
