import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme";
import { getMenuItems } from "@/helpers/menu";
import { useDrawerContext } from "@/context/useDrawerContext";
import { useLayoutContext } from "@/context/useLayoutContext";
import { useAuthContext } from "@/context/useAuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoBox from "../LogoBox";
import Avatar from "@/components/Avatar";
import httpClient from "@/helpers/httpClient";
import { getFaceStatus } from "@/services/faceApi";

const DRAWER_WIDTH = 280;

const menuIconMap = {
    "iconamoon:home-duotone": "home-outline",
    "iconamoon:screen-duotone": "desktop-outline",
    "iconamoon:shopping-bag-duotone": "bag-outline",
    "iconamoon:shopping-card-duotone": "cart-outline",
    "iconamoon:comment-dots-duotone": "chatbubbles-outline",
    "iconamoon:email-duotone": "mail-outline",
    "iconamoon:calendar-2-duotone": "calendar-outline",
    "iconamoon:check-circle-1-duotone": "checkmark-circle-outline",
    "iconamoon:profile-duotone": "people-outline",
    "iconamoon:file-document-duotone": "document-text-outline",
    "iconamoon:certificate-badge-duotone": "ribbon-outline",
    "iconamoon:component-duotone": "cube-outline",
    "iconamoon:funnel-duotone": "options-outline",
    "iconamoon:sign-minus-circle-duotone": "remove-circle-outline",
    "iconamoon:news-duotone": "notifications-outline",
    "iconamoon:credit-card-duotone": "card-outline",
    "iconamoon:flag-duotone": "flag-outline",
    "iconamoon:star-duotone": "star-outline",
    "iconamoon:gesture-tap-duotone": "hand-left-outline",
};

const getIcon = (iconName) => menuIconMap[iconName] || "ellipse-outline";

// Complete route → RN screen name mapping
const pathToScreen = {
    "/dashboard": "Dashboard",
    "/attendance": "Attendance",
    "/projects": "Projects",
    "/notifications": "Notifications",
    "/admin/employees": "EmployeeList",
    "/pages/profile": "Profile",
    "/pages/welcome": "Welcome",
    "/pages/faqs": "FAQs",
    "/pages/about-us": "AboutUs",
    "/pages/contact-us": "ContactUs",
    "/pages/our-team": "OurTeam",
    "/pages/timeline": "Timeline",
};

// Screens that live inside the bottom tab navigator
const TAB_SCREENS = new Set(["Dashboard", "Attendance", "Profile"]);

const MenuItem = ({ item, navigation, level = 0 }) => {
    const { colors } = useTheme();
    const { closeDrawer } = useDrawerContext();
    const [expanded, setExpanded] = useState(false);
    const hasChildren = item.children && item.children.length > 0;

    const handlePress = () => {
        if (hasChildren) {
            setExpanded(!expanded);
            return;
        }
        const screenName = item.url ? pathToScreen[item.url] : null;
        if (screenName) {
            if (TAB_SCREENS.has(screenName)) {
                navigation.navigate("Main", { screen: screenName });
            } else {
                navigation.navigate(screenName);
            }
            closeDrawer();
        } else if (item.url) {
            closeDrawer();
        }
    };

    if (item.isTitle) {
        return <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{item.label}</Text>;
    }

    return (
        <View>
            <TouchableOpacity
                style={[styles.menuItem, { paddingLeft: 16 + level * 16 }]}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                {item.icon && (
                    <Ionicons name={getIcon(item.icon)} size={20} color={colors.menuText} style={styles.menuIcon} />
                )}
                {!item.icon && level > 0 && (
                    <View style={styles.dotWrap}>
                        <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                    </View>
                )}
                <Text style={[styles.menuLabel, { color: colors.menuText }]} numberOfLines={1}>
                    {item.label}
                </Text>
                {item.badge && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.badgeText}>{item.badge.text}</Text>
                    </View>
                )}
                {hasChildren && (
                    <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={16} color={colors.menuText} />
                )}
            </TouchableOpacity>
            {hasChildren && expanded && (
                <View>
                    {item.children.map((child, idx) => (
                        <MenuItem key={child.key || idx} item={child} navigation={navigation} level={level + 1} />
                    ))}
                </View>
            )}
        </View>
    );
};

const DrawerContent = () => {
    const { colors } = useTheme();
    const navigation = useNavigation();
    const { closeDrawer } = useDrawerContext();
    const { user, removeSession } = useAuthContext();
    const { themeMode, changeTheme } = useLayoutContext();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState(null);

    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
        }).start();
    }, []);

    useEffect(() => {
        const endpoint = user?.role === "admin" ? "/api/admin/profile" : "/api/user/profile";
        httpClient
            .get(endpoint)
            .then((res) => setProfile(res.data))
            .catch(() => {});
    }, [user?.role]);

    const menuItems = getMenuItems(user?.role);
    const isDark = themeMode === "dark";

    const handleThemeToggle = () => {
        changeTheme(isDark ? "light" : "dark");
    };

    const handleLogout = () => {
        closeDrawer();
        setTimeout(() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: () => setTimeout(removeSession, 300) },
            ]);
        }, 200);
    };

    const displayName = profile?.name || user?.name || "User";
    const displayRole = profile?.roleInTeam || profile?.role || user?.role || "member";
    const orgName = profile?.organization?.name || profile?.organizationId?.name;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: colors.menuBg,
                    paddingTop: insets.top,
                    transform: [{ translateX: slideAnim }],
                },
            ]}
        >
            {/* Logo */}
            <View style={[styles.logoContainer, { borderBottomColor: colors.border }]}>
                <LogoBox />
            </View>

            {/* User card */}
            <View style={[styles.userCard, { backgroundColor: colors.primary }]}>
                {!!orgName && (
                    <View style={styles.orgPill}>
                        <Ionicons name="business-outline" size={10} color={colors.primary} />
                        <Text style={[styles.orgPillText, { color: colors.primary }]} numberOfLines={1}>
                            {orgName}
                        </Text>
                    </View>
                )}
                <View style={styles.userCardRow}>
                    <Avatar name={displayName} source={profile?.profileImage} size={42} variant="light" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text style={styles.userRole} numberOfLines={1}>
                            @{displayRole.toLowerCase().replace(/\s+/g, "_")}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Menu items */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {menuItems.map((item, idx) => (
                    <MenuItem key={item.key || idx} item={item} navigation={navigation} />
                ))}
                <View style={styles.scrollPadding} />
            </ScrollView>

            {/* Footer: register face (user only) + theme toggle + logout */}
            <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
                {user?.role !== "admin" && (
                    <TouchableOpacity
                        style={[
                            styles.footerBtn,
                            {
                                backgroundColor: "rgba(0,212,170,0.08)",
                                borderWidth: 1,
                                borderColor: "rgba(0,212,170,0.2)",
                            },
                        ]}
                        onPress={async () => {
                            closeDrawer();
                            try {
                                const { registered } = await getFaceStatus();
                                if (registered) {
                                    setTimeout(() => {
                                        Alert.alert(
                                            "Already Registered",
                                            "Your face is already registered in the system. You can use face recognition to mark attendance.",
                                            [{ text: "Close", style: "cancel" }]
                                        );
                                    }, 300);
                                } else {
                                    setTimeout(() => navigation.navigate("FaceRegistration"), 300);
                                }
                            } catch {
                                setTimeout(() => navigation.navigate("FaceRegistration"), 300);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="person-add-outline" size={18} color="#00D4AA" />
                        <Text style={[styles.footerBtnText, { color: "#00D4AA" }]}>Register Face</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.footerBtn, { backgroundColor: colors.inputBg }]}
                    onPress={handleThemeToggle}
                    activeOpacity={0.7}
                >
                    <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={colors.textSecondary} />
                    <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>
                        {isDark ? "Light Mode" : "Dark Mode"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.footerBtn, { backgroundColor: colors.dangerSoft }]}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                    <Text style={[styles.footerBtnText, { color: colors.danger }]}>Logout</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    logoContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    userCard: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 18,
    },
    orgPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,255,255,0.92)",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 12,
    },
    orgPillText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    userCardRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    userName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#fff",
    },
    userRole: {
        fontSize: 12,
        marginTop: 3,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "500",
    },
    scrollView: {
        flex: 1,
    },
    scrollPadding: {
        height: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingRight: 16,
    },
    menuIcon: {
        marginRight: 12,
        width: 20,
    },
    dotWrap: {
        width: 32,
        alignItems: "center",
        marginRight: 12,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    menuLabel: {
        fontSize: 14,
        flex: 1,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    badgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "600",
    },
    footer: {
        borderTopWidth: 1,
        padding: 12,
        gap: 8,
    },
    footerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    footerBtnText: {
        fontSize: 14,
        fontWeight: "500",
    },
});

export default DrawerContent;
