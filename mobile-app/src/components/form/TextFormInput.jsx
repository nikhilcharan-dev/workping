import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";
import { useTheme } from "@/theme";

const TextFormInput = ({
    control,
    name,
    label,
    placeholder,
    containerStyle,
    labelStyle,
    inputStyle,
    keyboardType = "default",
    autoCapitalize = "none",
    ...props
}) => {
    const { colors, borderRadius: br } = useTheme();

    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View style={[styles.container, containerStyle]}>
                    {label && <Text style={[styles.label, { color: colors.textPrimary }, labelStyle]}>{label}</Text>}
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.inputBg,
                                borderColor: error ? colors.danger : colors.inputBorder,
                                color: colors.inputText,
                                borderRadius: br.md,
                            },
                            inputStyle,
                        ]}
                        placeholder={placeholder}
                        placeholderTextColor={colors.inputPlaceholder}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        keyboardType={keyboardType}
                        autoCapitalize={autoCapitalize}
                        {...props}
                    />
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
    input: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    error: {
        fontSize: 12,
        marginTop: 4,
    },
});

export default TextFormInput;
