import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import LogoBox from "@/components/LogoBox";
import ThirdPartyAuth from "@/components/ThirdPartyAuth";
import TextFormInput from "@/components/form/TextFormInput";
import PasswordFormInput from "@/components/form/PasswordFormInput";
import Button from "@/components/Button";
import useSignIn from "./useSignIn";

const { width: SCREEN_W } = Dimensions.get("window");

const SignInScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const [role, setRole] = useState("admin");
    const { loading, login, control } = useSignIn(navigation, role);

    // Entrance animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const roleSlide = useRef(new Animated.Value(role === "admin" ? 0 : 1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const switchRole = (newRole) => {
        setRole(newRole);
        Animated.spring(roleSlide, {
            toValue: newRole === "admin" ? 0 : 1,
            tension: 60,
            friction: 9,
            useNativeDriver: true,
        }).start();
    };

    const toggleTranslateX = roleSlide.interpolate({
        inputRange: [0, 1],
        outputRange: [0, (SCREEN_W - 48 - 48) / 2], // half of toggle width
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.card,
                            { backgroundColor: colors.cardBg },
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.logoContainer}>
                            <LogoBox />
                        </View>

                        <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue</Text>

                        {/* Animated Role Toggle */}
                        <View
                            style={[
                                styles.roleToggle,
                                { backgroundColor: colors.background, borderColor: colors.border },
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.roleIndicator,
                                    {
                                        backgroundColor: colors.primary,
                                        transform: [{ translateX: toggleTranslateX }],
                                        width: (SCREEN_W - 48 - 48) / 2,
                                    },
                                ]}
                            />
                            <TouchableOpacity
                                style={styles.roleBtn}
                                onPress={() => switchRole("admin")}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="shield-outline"
                                    size={14}
                                    color={role === "admin" ? "#fff" : colors.textMuted}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[styles.roleBtnText, role === "admin" && styles.roleBtnTextActive]}>
                                    Admin
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.roleBtn}
                                onPress={() => switchRole("user")}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="person-outline"
                                    size={14}
                                    color={role === "user" ? "#fff" : colors.textMuted}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[styles.roleBtnText, role === "user" && styles.roleBtnTextActive]}>
                                    Employee
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            <TextFormInput
                                control={control}
                                name="email"
                                label="Email"
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <PasswordFormInput
                                control={control}
                                name="password"
                                label="Password"
                                placeholder="Enter your password"
                            />

                            <TouchableOpacity
                                onPress={() => navigation.navigate("ResetPassword")}
                                style={styles.forgotLink}
                            >
                                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
                            </TouchableOpacity>

                            <Button
                                variant="primary"
                                onPress={login}
                                loading={loading}
                                style={styles.signInBtn}
                                size="lg"
                            >
                                Sign In
                            </Button>
                        </View>

                        <ThirdPartyAuth role={role} />
                    </Animated.View>

                    <View style={styles.bottomRow}>
                        <Text style={styles.bottomText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                            <Text style={styles.bottomLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    card: {
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        textAlign: "center",
        marginBottom: 20,
    },
    roleToggle: {
        flexDirection: "row",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 24,
        borderWidth: 1,
        height: 44,
        position: "relative",
    },
    roleIndicator: {
        position: "absolute",
        top: 2,
        left: 2,
        bottom: 2,
        borderRadius: 8,
    },
    roleBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    roleBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6c757d",
    },
    roleBtnTextActive: {
        color: "#fff",
    },
    form: {},
    forgotLink: {
        alignSelf: "flex-end",
        marginBottom: 16,
        marginTop: -4,
    },
    forgotText: {
        fontSize: 13,
        fontWeight: "500",
    },
    signInBtn: {
        marginBottom: 16,
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 12,
        marginHorizontal: 12,
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
    },
    bottomText: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
    },
    bottomLink: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
});

export default SignInScreen;
