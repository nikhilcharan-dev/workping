import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useTheme } from "@/theme";
import LogoBox from "@/components/LogoBox";
import ThirdPartyAuth from "@/components/ThirdPartyAuth";
import TextFormInput from "@/components/form/TextFormInput";
import PasswordFormInput from "@/components/form/PasswordFormInput";
import Button from "@/components/Button";
import { useAuthContext } from "@/context/useAuthContext";
import { useNotificationContext } from "@/context/useNotificationContext";
import httpClient from "@/helpers/httpClient";
import { API_BASE_URL } from "@/helpers/config";

const baseSchema = {
    name: yup.string().required("Please enter your name"),
    email: yup.string().email("Please enter a valid email").required("Please enter your email"),
    password: yup.string().min(8, "Password must be at least 8 characters").required("Please enter your password"),
};

const getSignUpSchema = () =>
    yup.object({
        ...baseSchema,
        phoneNumber: yup
            .string()
            .matches(/^[+]?[\d\s-]{7,15}$/, "Please enter a valid phone number")
            .required("Please enter your phone number"),
    });

const SignUpScreen = ({ navigation }) => {
    const { colors } = useTheme();
    // Only admin sign up allowed
    const [loading, setLoading] = useState(false);
    const { saveSession } = useAuthContext();
    const { showNotification } = useNotificationContext();

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(getSignUpSchema()),
    });

    const onSubmit = handleSubmit(async (values) => {
        setLoading(true);
        try {
            const endpoint = `${API_BASE_URL}/api/admin/auth/register`;
            const payload = {
                name: values.name,
                email: values.email,
                password: values.password,
                number: values.phoneNumber,
            };
            const res = await httpClient.post(endpoint, payload);
            if (res.data.token) {
                saveSession({ ...res.data, token: res.data.token, role: "admin" });
                showNotification({ message: "Account created successfully!", variant: "success" });
            } else {
                showNotification({
                    message: res.data.message || "Registration succeeded. Please sign in.",
                    variant: "info",
                });
                navigation.navigate("SignIn");
            }
        } catch (e) {
            showNotification({
                message: e.response?.data?.message || "Registration failed",
                variant: "danger",
            });
        } finally {
            setLoading(false);
        }
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                    <View style={styles.logoContainer}>
                        <LogoBox />
                    </View>

                    <Text style={[styles.title, { color: colors.textPrimary }]}>Sign Up</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Create your account to get started.
                    </Text>

                    <View style={styles.form}>
                        <TextFormInput control={control} name="name" label="Name" placeholder="Enter your name" />
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
                        <TextFormInput
                            control={control}
                            name="phoneNumber"
                            label="Phone Number"
                            placeholder="Enter your phone number"
                            keyboardType="phone-pad"
                        />

                        <Button variant="primary" onPress={onSubmit} loading={loading} style={styles.btn}>
                            Sign Up
                        </Button>
                    </View>

                    <ThirdPartyAuth role="admin" />
                </View>

                <View style={styles.bottomRow}>
                    <Text style={styles.bottomText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                        <Text style={styles.bottomLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    card: {
        borderRadius: 12,
        padding: 24,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        textAlign: "center",
        marginBottom: 16,
    },
    form: {},
    btn: { marginBottom: 16 },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 16,
    },
    bottomText: { color: "#fff", fontSize: 14 },
    bottomLink: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default SignUpScreen;
