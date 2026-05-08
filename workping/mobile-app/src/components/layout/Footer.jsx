import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme";
import { currentYear, developedBy } from "@/context/constants";
import Icon from "../Icon";

const Footer = () => {
    return null;
};

const styles = StyleSheet.create({
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    text: {
        fontSize: 12,
    },
});

export default Footer;
