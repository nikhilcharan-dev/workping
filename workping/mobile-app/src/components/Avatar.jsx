import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { getVariantColor } from "@/theme/colors";

const Avatar = ({ source, name, size = 40, variant = "primary", style }) => {
    const { colors } = useTheme();

    if (source) {
        const imgSource = typeof source === "string" ? { uri: source } : source;
        return (
            <Image
                source={imgSource}
                style={[styles.image, { width: size, height: size, borderRadius: size / 2 }, style]}
            />
        );
    }

    const bgColor = getVariantColor(variant, colors);
    const initials = name
        ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
        : "?";

    return (
        <View
            style={[
                styles.placeholder,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: bgColor + "20",
                },
                style,
            ]}
        >
            <Text style={[styles.initials, { color: bgColor, fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    image: {
        resizeMode: "cover",
    },
    placeholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    initials: {
        fontWeight: "600",
    },
});

export default Avatar;
