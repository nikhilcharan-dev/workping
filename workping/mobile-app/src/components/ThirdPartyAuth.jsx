import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme";
import useOAuth from "@/hooks/useOAuth";

const ThirdPartyAuth = ({ role }) => {
    const { colors } = useTheme();
    const { loading, handleGoogleSignIn, handleMicrosoftSignIn } = useOAuth(role);

    return (
        <View style={styles.container}>
            <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR sign with</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.socialBtn, { backgroundColor: colors.light, borderColor: colors.border }]}
                    onPress={handleGoogleSignIn}
                    disabled={loading.google}
                >
                    {loading.google ? (
                        <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                        <Svg width={20} height={20} viewBox="0 0 48 48">
                            <Path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                            />
                            <Path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                            />
                            <Path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                            />
                            <Path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                            />
                        </Svg>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.socialBtn, { backgroundColor: colors.light, borderColor: colors.border }]}
                    onPress={handleMicrosoftSignIn}
                    disabled={loading.microsoft}
                >
                    {loading.microsoft ? (
                        <ActivityIndicator size="small" color="#00A4EF" />
                    ) : (
                        <Ionicons name="logo-microsoft" size={20} color="#00A4EF" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
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
        paddingHorizontal: 12,
        fontSize: 13,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
    },
    socialBtn: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
});

export default ThirdPartyAuth;
