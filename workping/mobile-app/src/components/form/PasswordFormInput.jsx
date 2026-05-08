import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";
import { useTheme } from "@/theme";
import Icon from "@/components/Icon";

const PasswordFormInput = ({ control, name, label, placeholder, containerStyle, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const { colors, borderRadius: br } = useTheme();

    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View style={[styles.container, containerStyle]}>
                    {label && (
                        <Text style={[styles.label, { color: colors.textPrimary }]}>
                            {typeof label === "string" ? label : "Password"}
                        </Text>
                    )}
                    <View
                        style={[
                            styles.inputWrapper,
                            {
                                backgroundColor: colors.inputBg,
                                borderColor: error ? colors.danger : colors.inputBorder,
                                borderRadius: br.md,
                            },
                        ]}
                    >
                        <TextInput
                            style={[styles.input, { color: colors.inputText }]}
                            placeholder={placeholder}
                            placeholderTextColor={colors.inputPlaceholder}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            {...props}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.toggleBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Icon
                                icon={showPassword ? "iconamoon:eye-off-duotone" : "iconamoon:eye-duotone"}
                                size={20}
                                color={colors.textMuted}
                            />
                        </TouchableOpacity>
                    </View>
                    {error && <Text style={[styles.error, { color: colors.danger }]}>{error.message}</Text>}
                </View>
            )}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: "500",
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    toggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    error: {
        fontSize: 12,
        marginTop: 4,
    },
});

export default PasswordFormInput;
