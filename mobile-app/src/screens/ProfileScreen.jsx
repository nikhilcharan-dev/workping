import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Switch, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Spinner from "@/components/Spinner";
import { useTheme } from "@/theme";
import { useNavigation } from "@react-navigation/native";
import { useAuthContext } from "@/context/useAuthContext";
import { useNotificationContext } from "@/context/useNotificationContext";
import httpClient from "@/helpers/httpClient";
import { getFaceStatus } from "@/services/faceApi";

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const InfoRow = ({ icon, label, value, colors, last }) => (
    <View style={[infoStyles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
        <View style={[infoStyles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={icon} size={15} color={colors.primary} />
        </View>
        <View style={infoStyles.content}>
            <Text style={[infoStyles.label, { color: colors.textMuted }]}>{label}</Text>
            <Text style={[infoStyles.value, { color: colors.textPrimary }]}>{value || "—"}</Text>
        </View>
    </View>
);

const infoStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 12,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    content: { flex: 1 },
    label: { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.4 },
    value: { fontSize: 14, marginTop: 1 },
});

const AlertBox = ({ type, message, colors }) => (
    <View
        style={[
            alertStyles.box,
            {
                backgroundColor: type === "success" ? colors.successSoft : colors.dangerSoft,
                borderColor: type === "success" ? colors.success : colors.danger,
            },
        ]}
    >
        <Ionicons
            name={type === "success" ? "checkmark-circle-outline" : "alert-circle-outline"}
            size={16}
            color={type === "success" ? colors.success : colors.danger}
        />
        <Text style={[alertStyles.text, { color: type === "success" ? colors.success : colors.danger }]}>
            {message}
        </Text>
    </View>
);

const alertStyles = StyleSheet.create({
    box: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
    },
    text: { fontSize: 13, flex: 1 },
});

// ─────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────

const ProfileScreen = () => {
    const { colors } = useTheme();
    const { removeSession, user } = useAuthContext();
    const { showNotification } = useNotificationContext();
    const navigation = useNavigation();
    const apiPath = user?.role === "admin" ? "/api/admin" : "/api/user";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);
    const [edit, setEdit] = useState(false);
    const [form, setForm] = useState({});
    const [success, setSuccess] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [faceRegistered, setFaceRegistered] = useState(null); // null = loading

    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(null);
    const [pwError, setPwError] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [loading]);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (user?.role !== "admin") {
            getFaceStatus()
                .then(({ registered }) => setFaceRegistered(registered))
                .catch(() => setFaceRegistered(false));
        }
    }, [user?.role]);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await httpClient.get(`${apiPath}/profile`);
            setProfile(res.data);
            setForm({
                name: res.data.name || "",
                email: res.data.email || "",
                phone: res.data.phone || "",
                gender: res.data.gender || "",
                dob: res.data.dob || "",
                address: res.data.address || "",
                twoFactorEnabled: !!res.data.twoFactorEnabled,
            });
        } catch (e) {
            setError(e.response?.data?.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission needed", "Please grant access to your photo library.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
            setUploadingImage(true);
            try {
                const formData = new FormData();
                formData.append("profileImage", {
                    uri: result.assets[0].uri,
                    name: "profile.jpg",
                    type: "image/jpeg",
                });
                await httpClient.post(`${apiPath}/update-profile-image`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                showNotification({ message: "Profile photo updated!", variant: "success" });
                fetchProfile();
            } catch (e) {
                showNotification({
                    message: e.response?.data?.message || "Failed to update photo",
                    variant: "danger",
                });
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const handleUpdate = async () => {
        setSaving(true);
        setSuccess(null);
        setError(null);
        try {
            const updateData = { ...form };
            if (user?.role === "admin") {
                updateData.phoneNumber = form.phone;
                delete updateData.phone;
                delete updateData.gender;
                delete updateData.dob;
                delete updateData.address;
            }
            updateData.email = form.email;
            updateData.twoFactorEnabled = form.twoFactorEnabled;

            const res = await httpClient.post(`${apiPath}/update-profile`, updateData);
            setSuccess(res.data.message || "Profile updated!");
            setEdit(false);
            showNotification({ message: "Profile updated successfully!", variant: "success" });
            fetchProfile();
        } catch (e) {
            setError(e.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!pwForm.currentPassword || !pwForm.newPassword) {
            setPwError("Please fill in both password fields");
            return;
        }
        if (pwForm.newPassword.length < 8) {
            setPwError("New password must be at least 8 characters");
            return;
        }
        setPwSaving(true);
        setPwSuccess(null);
        setPwError(null);
        try {
            const res = await httpClient.post(`${apiPath}/change-password`, pwForm);
            setPwSuccess(res.data.message || "Password changed successfully!");
            setPwForm({ currentPassword: "", newPassword: "" });
            showNotification({ message: "Password updated!", variant: "success" });
        } catch (e) {
            setPwError(e.response?.data?.message || "Failed to change password");
        } finally {
            setPwSaving(false);
        }
    };

    const handleDeactivate = () => {
        Alert.alert(
            "Deactivate Account",
            "This will permanently deactivate your account. You will need an admin to reactivate it. Proceed?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Deactivate",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await httpClient.post(`${apiPath}/deactivate-account`, {
                                password: pwForm.currentPassword,
                            });
                            setTimeout(removeSession, 300);
                        } catch (e) {
                            Alert.alert("Failed", e.response?.data?.message || "Could not deactivate account");
                        }
                    },
                },
            ]
        );
    };

    const inputStyle = [
        styles.input,
        {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.inputText,
        },
    ];

    if (loading) {
        return (
            <ScreenWrapper showFooter={false}>
                <View style={styles.center}>
                    <Spinner size="large" />
                </View>
            </ScreenWrapper>
        );
    }

    if (error && !profile) {
        return (
            <ScreenWrapper showFooter={false}>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
                    <Text style={[styles.fatalError, { color: colors.danger }]}>{error}</Text>
                    <Button variant="primary" outline title="Retry" onPress={fetchProfile} style={{ marginTop: 12 }} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper showFooter={false}>
            <Animated.View style={{ opacity: fadeAnim }}>
                {/* Profile Header */}
                <Card>
                    <Card.Body>
                        <View style={styles.profileHeader}>
                            <TouchableOpacity
                                style={styles.avatarWrap}
                                onPress={handlePickImage}
                                disabled={uploadingImage}
                                activeOpacity={0.8}
                            >
                                <Avatar
                                    name={profile?.name}
                                    source={profile?.profileImage}
                                    size={88}
                                    variant="primary"
                                />
                                <View
                                    style={[
                                        styles.avatarOnline,
                                        { backgroundColor: colors.success, borderColor: colors.card },
                                    ]}
                                />
                                <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
                                    {uploadingImage ? (
                                        <Spinner size="small" color="light" style={{ padding: 0 }} />
                                    ) : (
                                        <Ionicons name="camera" size={12} color="#fff" />
                                    )}
                                </View>
                            </TouchableOpacity>
                            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{profile?.name}</Text>
                            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{profile?.email}</Text>
                            <View style={styles.badgeRow}>
                                <Badge variant="primary" soft pill>
                                    {profile?.roleInTeam || profile?.role || "Member"}
                                </Badge>
                                {profile?.organizationId?.name && (
                                    <Badge variant="info" soft pill>
                                        {profile.organizationId.name}
                                    </Badge>
                                )}
                                {profile?.teamId?.teamName && (
                                    <Badge variant="success" soft pill>
                                        {profile.teamId.teamName}
                                    </Badge>
                                )}
                            </View>
                        </View>
                    </Card.Body>
                </Card>

                {/* Face Recognition Status (users only) */}
                {user?.role !== "admin" && (
                    <Card>
                        <Card.Body>
                            <View style={faceStyles.row}>
                                <View
                                    style={[
                                        faceStyles.iconWrap,
                                        {
                                            backgroundColor:
                                                faceRegistered === true
                                                    ? "rgba(0,212,170,0.1)"
                                                    : faceRegistered === false
                                                      ? "rgba(245,158,11,0.1)"
                                                      : colors.primarySoft,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={faceRegistered === true ? "scan-circle-outline" : "person-add-outline"}
                                        size={20}
                                        color={
                                            faceRegistered === true
                                                ? "#00D4AA"
                                                : faceRegistered === false
                                                  ? "#F59E0B"
                                                  : colors.primary
                                        }
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[faceStyles.label, { color: colors.textMuted }]}>
                                        Face Recognition
                                    </Text>
                                    {faceRegistered === null ? (
                                        <Text style={[faceStyles.statusText, { color: colors.textMuted }]}>
                                            Checking…
                                        </Text>
                                    ) : (
                                        <Text
                                            style={[
                                                faceStyles.statusText,
                                                { color: faceRegistered ? "#00D4AA" : "#F59E0B" },
                                            ]}
                                        >
                                            {faceRegistered ? "Registered" : "Not Registered"}
                                        </Text>
                                    )}
                                </View>
                                {faceRegistered === false && (
                                    <TouchableOpacity
                                        style={faceStyles.registerBtn}
                                        onPress={() => navigation.navigate("FaceRegistration")}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="person-add-outline" size={13} color="#fff" />
                                        <Text style={faceStyles.registerBtnText}>Register</Text>
                                    </TouchableOpacity>
                                )}
                                {faceRegistered === true && (
                                    <View style={faceStyles.registeredBadge}>
                                        <Ionicons name="checkmark-circle" size={13} color="#00D4AA" />
                                        <Text style={faceStyles.registeredBadgeText}>Active</Text>
                                    </View>
                                )}
                            </View>
                        </Card.Body>
                    </Card>
                )}

                {/* Personal Info */}
                <Card>
                    <Card.Header>
                        <View style={styles.cardHead}>
                            <Ionicons name="person-outline" size={18} color={colors.primary} />
                            <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Personal Info</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setEdit(!edit);
                                    setSuccess(null);
                                    setError(null);
                                }}
                                style={[
                                    styles.editBtn,
                                    { backgroundColor: edit ? colors.dangerSoft : colors.primarySoft },
                                ]}
                            >
                                <Ionicons
                                    name={edit ? "close-outline" : "create-outline"}
                                    size={15}
                                    color={edit ? colors.danger : colors.primary}
                                />
                                <Text style={[styles.editBtnText, { color: edit ? colors.danger : colors.primary }]}>
                                    {edit ? "Cancel" : "Edit"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Card.Header>
                    <Card.Body>
                        {success && <AlertBox type="success" message={success} colors={colors} />}
                        {error && <AlertBox type="error" message={error} colors={colors} />}

                        {edit ? (
                            <View>
                                {[
                                    {
                                        key: "name",
                                        label: "Full Name",
                                        placeholder: "Enter full name",
                                        keyboard: "default",
                                        icon: "person-outline",
                                    },
                                    {
                                        key: "email",
                                        label: "Email Address",
                                        placeholder: "Enter email address",
                                        keyboard: "email-address",
                                        icon: "mail-outline",
                                    },
                                    {
                                        key: "phone",
                                        label: "Phone Number",
                                        placeholder: "Enter phone number",
                                        keyboard: "phone-pad",
                                        icon: "call-outline",
                                    },
                                    ...(user?.role !== "admin"
                                        ? [
                                              {
                                                  key: "gender",
                                                  label: "Gender",
                                                  placeholder: "male / female / other",
                                                  keyboard: "default",
                                                  icon: "male-female-outline",
                                              },
                                              {
                                                  key: "dob",
                                                  label: "Date of Birth",
                                                  placeholder: "YYYY-MM-DD",
                                                  keyboard: "default",
                                                  icon: "calendar-outline",
                                              },
                                          ]
                                        : []),
                                ].map(({ key, label, placeholder, keyboard, icon }) => (
                                    <View key={key} style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                            <Ionicons name={icon} size={12} color={colors.textMuted} /> {label}
                                        </Text>
                                        <TextInput
                                            style={inputStyle}
                                            value={form[key]}
                                            onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                                            placeholder={placeholder}
                                            placeholderTextColor={colors.inputPlaceholder}
                                            keyboardType={keyboard}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                ))}
                                {user?.role !== "admin" && (
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                            <Ionicons name="location-outline" size={12} color={colors.textMuted} />{" "}
                                            Address
                                        </Text>
                                        <TextInput
                                            style={[
                                                inputStyle,
                                                { minHeight: 72, textAlignVertical: "top", paddingTop: 10 },
                                            ]}
                                            value={form.address}
                                            onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                                            placeholder="Enter address"
                                            placeholderTextColor={colors.inputPlaceholder}
                                            multiline
                                        />
                                    </View>
                                )}
                                <View style={styles.switchGroup}>
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[
                                                styles.inputLabel,
                                                { color: colors.textSecondary, marginBottom: 2 },
                                            ]}
                                        >
                                            <Ionicons
                                                name="shield-checkmark-outline"
                                                size={12}
                                                color={colors.textMuted}
                                            />{" "}
                                            Two-Factor Authentication
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textMuted }}>
                                            Enhance your account security
                                        </Text>
                                    </View>
                                    <Switch
                                        value={form.twoFactorEnabled}
                                        onValueChange={(v) => setForm((f) => ({ ...f, twoFactorEnabled: v }))}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                        thumbColor="#fff"
                                    />
                                </View>

                                <Button
                                    variant="primary"
                                    title="Save Changes"
                                    loading={saving}
                                    onPress={handleUpdate}
                                    size="lg"
                                />
                            </View>
                        ) : (
                            <View>
                                <InfoRow icon="mail-outline" label="Email" value={profile?.email} colors={colors} />
                                <InfoRow
                                    icon="call-outline"
                                    label="Phone"
                                    value={profile?.phoneNumber || profile?.phone}
                                    colors={colors}
                                />
                                <InfoRow
                                    icon="shield-checkmark-outline"
                                    label="2FA Status"
                                    value={profile?.twoFactorEnabled ? "Enabled" : "Disabled"}
                                    colors={colors}
                                />
                                {user?.role !== "admin" && (
                                    <>
                                        <InfoRow
                                            icon="male-female-outline"
                                            label="Gender"
                                            value={profile?.gender}
                                            colors={colors}
                                        />
                                        <InfoRow
                                            icon="calendar-outline"
                                            label="Date of Birth"
                                            value={profile?.dob}
                                            colors={colors}
                                        />
                                        <InfoRow
                                            icon="location-outline"
                                            label="Address"
                                            value={profile?.address}
                                            colors={colors}
                                            last
                                        />
                                    </>
                                )}
                            </View>
                        )}
                    </Card.Body>
                </Card>

                {/* Security */}
                <Card>
                    <Card.Header>
                        <TouchableOpacity
                            style={styles.cardHead}
                            onPress={() => setShowPasswordSection(!showPasswordSection)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                            <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Security</Text>
                            <Ionicons
                                name={showPasswordSection ? "chevron-up" : "chevron-down"}
                                size={18}
                                color={colors.textMuted}
                            />
                        </TouchableOpacity>
                    </Card.Header>
                    {showPasswordSection && (
                        <Card.Body>
                            {pwSuccess && <AlertBox type="success" message={pwSuccess} colors={colors} />}
                            {pwError && <AlertBox type="error" message={pwError} colors={colors} />}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                    Current Password
                                </Text>
                                <TextInput
                                    style={inputStyle}
                                    value={pwForm.currentPassword}
                                    onChangeText={(v) => setPwForm((f) => ({ ...f, currentPassword: v }))}
                                    placeholder="Enter current password"
                                    placeholderTextColor={colors.inputPlaceholder}
                                    secureTextEntry
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
                                <TextInput
                                    style={inputStyle}
                                    value={pwForm.newPassword}
                                    onChangeText={(v) => setPwForm((f) => ({ ...f, newPassword: v }))}
                                    placeholder="Enter new password (min 8 characters)"
                                    placeholderTextColor={colors.inputPlaceholder}
                                    secureTextEntry
                                />
                            </View>
                            <Button
                                variant="primary"
                                title="Update Password"
                                loading={pwSaving}
                                onPress={handleChangePassword}
                            />
                        </Card.Body>
                    )}
                </Card>

                {/* Account Actions */}
                <Card>
                    <Card.Header>
                        <View style={styles.cardHead}>
                            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
                            <Text style={[styles.cardHeadTitle, { color: colors.textPrimary }]}>Account</Text>
                        </View>
                    </Card.Header>
                    <Card.Body>
                        <Button
                            variant="danger"
                            outline
                            title="Logout"
                            icon={<Ionicons name="log-out-outline" size={16} color={colors.danger} />}
                            onPress={() => {
                                Alert.alert("Logout", "Are you sure you want to logout?", [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Logout",
                                        style: "destructive",
                                        onPress: () => setTimeout(removeSession, 300),
                                    },
                                ]);
                            }}
                            style={{ marginBottom: 10 }}
                        />
                        <Button
                            variant="danger"
                            title="Deactivate Account"
                            icon={<Ionicons name="trash-outline" size={16} color="#fff" />}
                            onPress={handleDeactivate}
                        />
                    </Card.Body>
                </Card>
            </Animated.View>
        </ScreenWrapper>
    );
};

const faceStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: 11,
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "600",
        marginTop: 2,
    },
    registerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#F59E0B",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    registerBtnText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    registeredBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0,212,170,0.1)",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "rgba(0,212,170,0.25)",
    },
    registeredBadgeText: {
        color: "#00D4AA",
        fontSize: 12,
        fontWeight: "600",
    },
});

const styles = StyleSheet.create({
    center: {
        flex: 1,
        minHeight: 300,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    fatalError: {
        fontSize: 15,
        textAlign: "center",
    },
    profileHeader: {
        alignItems: "center",
        paddingVertical: 8,
    },
    avatarWrap: {
        position: "relative",
        marginBottom: 12,
    },
    avatarOnline: {
        position: "absolute",
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
    },
    cameraOverlay: {
        position: "absolute",
        bottom: -2,
        left: "50%",
        marginLeft: -14,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#fff",
    },
    profileName: {
        fontSize: 20,
        fontWeight: "700",
    },
    profileEmail: {
        fontSize: 13,
        marginTop: 3,
    },
    badgeRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 6,
        marginTop: 10,
    },
    cardHead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    cardHeadTitle: {
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
    },
    editBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    editBtnText: {
        fontSize: 12,
        fontWeight: "600",
    },
    inputGroup: {
        marginBottom: 14,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "500",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    switchGroup: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        marginBottom: 16,
    },
});

export default ProfileScreen;
