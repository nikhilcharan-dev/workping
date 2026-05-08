import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import { useTheme } from "@/theme";

const ComponentContainerCard = ({ title, description, children, style }) => {
    const { colors } = useTheme();

    return (
        <Card style={style}>
            {title && (
                <Card.Header>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                    {description && (
                        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
                    )}
                </Card.Header>
            )}
            <Card.Body>{children}</Card.Body>
        </Card>
    );
};

const styles = StyleSheet.create({
    title: {
        fontSize: 16,
        fontWeight: "600",
    },
    description: {
        fontSize: 13,
        marginTop: 4,
    },
});

export default ComponentContainerCard;
