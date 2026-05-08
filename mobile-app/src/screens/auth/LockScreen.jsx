import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useTheme } from "@/theme";
import LogoBox from "@/components/LogoBox";
import Avatar from "@/components/Avatar";
import PasswordFormInput from "@/components/form/PasswordFormInput";
import Button from "@/components/Button";
import { useAuthContext } from "@/context/useAuthContext";
import { useNotificationContext } from "@/context/useNotificationContext";
import httpClient from "@/helpers/httpClient";

const lockSchema = yup.object({
    password: yup.string().required("Please enter your password"),
});

const LockScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const { user, removeSession } = useAuthContext();
    const { showNotification } = useNotificationContext();
    const [loading, setLoading] = useState(false);

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(lockSchema),
    });

    const onSubmit = handleSubmit(async ({ password }) => {
        setLoading(true);
        try {
            const endpoint = user?.role === "admin" ? "/api/admin/auth/login" : "/api/auth/login";
            await httpClient.post(endpoint, { email: user?.email, password });
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
        } catch {
            showNotification({ message: "Incorrect password. Please try again.", variant: "danger" });
        } finally {
            setLoading(false);
        }
    });

    const handleNotYou = () => {
        Alert.alert("Switch Account", "This will log you out. Continue?", [
            { text: "Cancel", style: "cancel" },
            { text: "Yes, logout", style: "destructive", onPress: () => removeSession() },
        ]);
    };

    const displayName = user?.name || "User";

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
                        <View style={styles.logoContainer}>
                            <LogoBox />
                        </View>

                        <View style={styles.avatarWrap}>
                            <Avatar name={displayName} size={72} variant="primary" />
                        </View>

                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            Hi, {displayName.split(" ")[0]}!
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Enter your password to unlock the app.
                        </Text>

                        <View style={styles.form}>
                            <PasswordFormInput
                                control={control}
                                name="password"
                                label="Password"
                                placeholder="Enter your password"
                            />

                            <Button variant="primary" onPress={onSubmit} loading={loading} style={styles.btn}>
                                Unlock
                            </Button>
                        </View>
                    </View>

                    <View style={styles.bottomRow}>
                        <Text style={styles.bottomText}>Not you? </Text>
                        <TouchableOpacity onPress={handleNotYou}>
                            <Text style={styles.bottomLink}>Switch account</Text>
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
        padding: 20,
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
    avatarWrap: {
        alignItems: "center",
        marginBottom: 16,
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
        marginBottom: 24,
    },
    form: {},
    btn: { marginBottom: 16 },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 16,
    },
    bottomText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
    bottomLink: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default LockScreen;
