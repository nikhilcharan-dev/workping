import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme";

const LogoBox = ({ size = "default" }) => {
    const { colors } = useTheme();
    const fontSize = size === "small" ? 18 : 24;
    const imageSize = size === "small" ? 24 : 32;

    return (
        <View style={styles.container}>
            <Image
                source={require("../../assets/logo-sm.png")}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
            />
            {size !== "small" && (
                <Text style={[styles.brandName, { color: colors.textPrimary, fontSize }]}>WorkPing</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    logoSquare: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    logoText: {
        color: "#ffffff",
        fontWeight: "700",
    },
    brandName: {
        fontWeight: "700",
    },
});

export default LogoBox;
