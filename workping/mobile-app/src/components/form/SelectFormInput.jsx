import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";
import { useTheme } from "@/theme";
import Icon from "../Icon";

const SelectFormInput = ({ control, name, label, placeholder = "Select an option", options = [], containerStyle }) => {
    const { colors, borderRadius: br } = useTheme();
    const [visible, setVisible] = useState(false);

    const getLabel = (val) => {
        const opt = options.find((o) => (typeof o === "object" ? o.value : o) === val);
        return opt ? (typeof opt === "object" ? opt.label : opt) : "";
    };

    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <View style={[styles.container, containerStyle]}>
                    {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
                    <TouchableOpacity
                        style={[
                            styles.select,
                            {
                                backgroundColor: colors.inputBg,
                                borderColor: error ? colors.danger : colors.inputBorder,
                                borderRadius: br.md,
                            },
                        ]}
                        onPress={() => setVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.selectText,
                                {
                                    color: value ? colors.inputText : colors.inputPlaceholder,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {value ? getLabel(value) : placeholder}
                        </Text>
                        <Icon icon="bx:chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {error && <Text style={[styles.error, { color: colors.danger }]}>{error.message}</Text>}

                    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
                        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
                            <View
                                style={[
                                    styles.dropdown,
                                    {
                                        backgroundColor: colors.cardBg,
                                        borderRadius: br.lg,
                                    },
                                ]}
                            >
                                <FlatList
                                    data={options}
                                    keyExtractor={(item, idx) => String(idx)}
                                    ListEmptyComponent={
                                        <Text
                                            style={[
                                                styles.optionText,
                                                { textAlign: "center", paddingVertical: 16, color: colors.textMuted },
                                            ]}
                                        >
                                            No options available
                                        </Text>
                                    }
                                    renderItem={({ item }) => {
                                        const val = typeof item === "object" ? item.value : item;
                                        const lbl = typeof item === "object" ? item.label : item;
                                        const selected = val === value;
                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.option,
                                                    selected && {
                                                        backgroundColor: colors.primary + "15",
                                                    },
                                                ]}
                                                onPress={() => {
                                                    onChange(val);
                                                    setVisible(false);
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.optionText,
                                                        {
                                                            color: selected ? colors.primary : colors.textPrimary,
                                                        },
                                                    ]}
                                                >
                                                    {lbl}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            </View>
                        </TouchableOpacity>
                    </Modal>
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
    select: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    selectText: {
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    error: {
        fontSize: 12,
        marginTop: 4,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    dropdown: {
        maxHeight: 300,
        paddingVertical: 8,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    option: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    optionText: {
        fontSize: 14,
    },
});

export default SelectFormInput;
