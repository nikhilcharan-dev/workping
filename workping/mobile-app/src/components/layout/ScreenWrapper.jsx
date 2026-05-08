import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import Header from "./Header";
import Footer from "./Footer";

const ScreenWrapper = ({
    children,
    title,
    scrollable = true,
    showFooter = true,
    refreshControl,
    contentContainerStyle,
}) => {
    const { colors } = useTheme();

    const content = scrollable ? (
        <ScrollView
            style={[styles.scroll, { backgroundColor: colors.bodyBg }]}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={refreshControl}
        >
            {children}
        </ScrollView>
    ) : (
        <View style={[styles.content, { backgroundColor: colors.bodyBg }]}>{children}</View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.bodyBg }]}>
            <Header title={title} />
            {content}
            {showFooter && <Footer />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 24,
    },
    content: {
        flex: 1,
    },
});

export default ScreenWrapper;
