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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useTheme } from "@/theme";
import LogoBox from "@/components/LogoBox";
import TextFormInput from "@/components/form/TextFormInput";
import Button from "@/components/Button";
import { useNotificationContext } from "@/context/useNotificationContext";
import httpClient from "@/helpers/httpClient";

const resetPasswordSchema = yup.object({
    email: yup.string().email("Please enter a valid email").required("Please enter your email"),
});

const ResetPasswordScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const { showNotification } = useNotificationContext();
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const successScale = useRef(new Animated.Value(0)).current;

    const { control, handleSubmit, getValues } = useForm({
        resolver: yupResolver(resetPasswordSchema),
    });

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const onSubmit = handleSubmit(async (values) => {
        setLoading(true);
        try {
            await httpClient.post("/api/admin/auth/forgot-password", { email: values.email });
            setSent(true);
            Animated.spring(successScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
            showNotification({ message: "Reset link sent to your email!", variant: "success" });
        } catch (e) {
            // Even on error, show success to prevent email enumeration
            setSent(true);
            Animated.spring(successScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
        } finally {
            setLoading(false);
        }
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
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                        ]}
                    >
                        <View style={styles.logoContainer}>
                            <LogoBox />
                        </View>

                        {sent ? (
                            <Animated.View style={[styles.successContainer, { transform: [{ scale: successScale }] }]}>
                                <View style={[styles.successIcon, { backgroundColor: colors.successSoft }]}>
                                    <Ionicons name="mail-outline" size={40} color={colors.success} />
                                </View>
                                <Text style={[styles.title, { color: colors.textPrimary }]}>Check Your Email</Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                    We've sent password reset instructions to{" "}
                                    <Text style={{ fontWeight: "600", color: colors.textPrimary }}>
                                        {getValues("email")}
                                    </Text>
                                </Text>
                                <Button
                                    variant="primary"
                                    onPress={() => navigation.navigate("SignIn")}
                                    style={styles.btn}
                                    size="lg"
                                >
                                    Back to Sign In
                                </Button>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSent(false);
                                        successScale.setValue(0);
                                    }}
                                    style={styles.resendLink}
                                >
                                    <Text style={[styles.resendText, { color: colors.primary }]}>
                                        Didn't receive it? Resend
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <>
                                <View style={[styles.iconContainer, { backgroundColor: colors.primarySoft }]}>
                                    <Ionicons name="lock-open-outline" size={32} color={colors.primary} />
                                </View>

                                <Text style={[styles.title, { color: colors.textPrimary }]}>Reset Password</Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                    Enter your email address and we'll send you instructions to reset your password.
                                </Text>

                                <View style={styles.form}>
                                    <TextFormInput
                                        control={control}
                                        name="email"
                                        label="Email Address"
                                        placeholder="Enter your email"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />

                                    <Button
                                        variant="primary"
                                        onPress={onSubmit}
                                        loading={loading}
                                        style={styles.btn}
                                        size="lg"
                                    >
                                        Send Reset Link
                                    </Button>
                                </View>
                            </>
                        )}
                    </Animated.View>

                    <View style={styles.bottomRow}>
                        <Text style={styles.bottomText}>Remember your password? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                            <Text style={styles.bottomLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
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
        marginBottom: 16,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        textAlign: "center",
        marginBottom: 24,
        paddingHorizontal: 8,
        lineHeight: 20,
    },
    form: {},
    btn: { marginBottom: 12 },
    successContainer: {
        alignItems: "center",
        paddingVertical: 8,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    resendLink: {
        marginTop: 8,
        padding: 8,
    },
    resendText: {
        fontSize: 13,
        fontWeight: "500",
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 20,
    },
    bottomText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
    bottomLink: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default ResetPasswordScreen;
