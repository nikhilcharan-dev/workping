import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import { useLayoutContext } from "@/context/useLayoutContext";
import { useDrawerContext } from "@/context/useDrawerContext";

const Header = ({ title }) => {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const { themeMode, changeTheme } = useLayoutContext();
    const { toggleDrawer } = useDrawerContext();

    const toggleTheme = () => {
        changeTheme(themeMode === "dark" ? "light" : "dark");
    };

    return (
        <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: colors.topbarBg }]}>
            <StatusBar
                barStyle={themeMode === "dark" ? "light-content" : "dark-content"}
                backgroundColor={colors.topbarBg}
            />
            <View style={[styles.header, { backgroundColor: colors.topbarBg, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={toggleDrawer} style={styles.iconBtn}>
                    <Ionicons name="menu-outline" size={24} color={colors.topbarText} />
                </TouchableOpacity>

                {title ? (
                    <Text style={[styles.title, { color: colors.topbarText }]} numberOfLines={1}>
                        {title}
                    </Text>
                ) : (
                    <View style={styles.logoRow}>
                        <View style={[styles.logoDot, { backgroundColor: colors.primary }]}>
                            <Text style={styles.logoLetter}>W</Text>
                        </View>
                        <Text style={[styles.logoText, { color: colors.topbarText }]}>WorkPing</Text>
                    </View>
                )}

                <View style={styles.rightIcons}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                        <Ionicons
                            name={themeMode === "dark" ? "sunny-outline" : "moon-outline"}
                            size={20}
                            color={colors.topbarText}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.iconBtn}>
                        <Ionicons name="person-circle-outline" size={24} color={colors.topbarText} />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {},
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        height: 56,
        borderBottomWidth: 1,
    },
    iconBtn: {
        padding: 6,
    },
    title: {
        fontSize: 17,
        fontWeight: "600",
        flex: 1,
        textAlign: "center",
        marginHorizontal: 8,
    },
    logoRow: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginLeft: 8,
    },
    logoDot: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    logoLetter: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    logoText: {
        fontSize: 18,
        fontWeight: "700",
        marginLeft: 8,
    },
    rightIcons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
});

export default Header;
