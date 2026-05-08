import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme";

const Card = ({ children, style, variant, ...props }) => {
    const { colors, borderRadius: br } = useTheme();

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderRadius: br.lg,
                    borderColor: colors.cardBorder,
                    shadowColor: colors.shadow,
                },
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
};

const CardHeader = ({ children, style }) => {
    const { colors } = useTheme();
    return <View style={[styles.cardHeader, { borderBottomColor: colors.divider }, style]}>{children}</View>;
};

const CardBody = ({ children, style }) => {
    return <View style={[styles.cardBody, style]}>{children}</View>;
};

const CardFooter = ({ children, style }) => {
    const { colors } = useTheme();
    return <View style={[styles.cardFooter, { borderTopColor: colors.divider }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        padding: 16,
        borderBottomWidth: 1,
    },
    cardBody: {
        padding: 16,
    },
    cardFooter: {
        padding: 16,
        borderTopWidth: 1,
    },
});

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
