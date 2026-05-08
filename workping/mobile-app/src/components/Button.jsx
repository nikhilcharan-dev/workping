import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme";
import { getVariantColor } from "@/theme/colors";

const Button = ({
    children,
    title,
    variant = "primary",
    outline = false,
    size = "md",
    disabled = false,
    loading = false,
    onPress,
    style,
    textStyle,
    icon,
    ...props
}) => {
    const { colors, borderRadius: br } = useTheme();
    const variantColor = getVariantColor(variant, colors);

    const sizeStyles = {
        sm: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 12 },
        md: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
        lg: { paddingHorizontal: 20, paddingVertical: 14, fontSize: 16 },
    };

    const s = sizeStyles[size] || sizeStyles.md;
    const bgColor = outline ? "transparent" : variantColor;
    const txtColor = outline ? variantColor : variant === "light" ? colors.textPrimary : "#ffffff";
    const borderColor = variantColor;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            style={[
                styles.button,
                {
                    backgroundColor: bgColor,
                    borderColor,
                    borderRadius: br.md,
                    paddingHorizontal: s.paddingHorizontal,
                    paddingVertical: s.paddingVertical,
                    opacity: disabled ? 0.6 : 1,
                },
                outline && styles.outline,
                style,
            ]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator size="small" color={txtColor} />
            ) : (
                <>
                    {icon}
                    <Text style={[styles.text, { color: txtColor, fontSize: s.fontSize }, textStyle]}>
                        {title || children}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        gap: 6,
    },
    outline: {
        borderWidth: 1.5,
    },
    text: {
        fontWeight: "600",
        textAlign: "center",
    },
});

export default Button;
