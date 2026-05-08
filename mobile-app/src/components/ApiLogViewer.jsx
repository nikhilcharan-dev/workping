import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "react-native";
import logStore from "@/helpers/logStore";
import runtimeConfig from "@/helpers/runtimeConfig";
import { useTheme } from "@/theme";
import Icon from "./Icon";

const ApiLogViewer = () => {
    const [logs, setLogs] = useState(logStore.getLogs());
    const [isVisible, setIsVisible] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [editingUrl, setEditingUrl] = useState("");
    const [currentUrl, setCurrentUrl] = useState("");
    const { colors, spacing, typography, isDark } = useTheme();

    useEffect(() => {
        runtimeConfig.init().then((url) => {
            setCurrentUrl(url);
            setEditingUrl(url);
        });
    }, []);

    useEffect(() => {
        const handleLogsChange = (newLogs) => {
            setLogs([...newLogs]);
        };
        logStore.on("change", handleLogsChange);
        return () => {
            logStore.off("change", handleLogsChange);
        };
    }, []);

    const clearLogs = () => {
        logStore.clearLogs();
    };

    const saveUrl = async () => {
        const updated = await runtimeConfig.setApiUrl(editingUrl);
        setCurrentUrl(updated);
        alert("API URL updated! New requests will use this URL.");
    };

    const renderLogItem = ({ item }) => {
        const isRequest = item.type === "request";
        const isError = item.type === "error";

        let color = colors.info;
        if (isError) color = colors.danger;
        if (item.type === "response") color = colors.success;

        return (
            <TouchableOpacity
                style={[styles.logItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => setSelectedLog(item)}
            >
                <View style={styles.logHeader}>
                    <Text style={[styles.logType, { color, fontWeight: "bold" }]}>{item.type.toUpperCase()}</Text>
                    <Text style={[styles.logTime, { color: colors.textMuted }]}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                </View>
                <Text style={[styles.logUrl, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.method ? `${item.method} ` : ""}
                    {item.url}
                </Text>
                {item.status && (
                    <Text style={[styles.logStatus, { color: item.status >= 400 ? colors.danger : colors.success }]}>
                        Status: {item.status}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => setIsVisible(true)}
            >
                <Icon icon="iconamoon:history-duotone" color="#fff" size={24} />
            </TouchableOpacity>

            <Modal visible={isVisible} animationType="slide" transparent={false}>
                <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>API Logs & Config</Text>
                            <View style={styles.urlEditor}>
                                <TextInput
                                    style={[
                                        styles.urlInput,
                                        {
                                            borderColor: colors.border,
                                            color: colors.textPrimary,
                                            backgroundColor: colors.surface,
                                        },
                                    ]}
                                    value={editingUrl}
                                    onChangeText={setEditingUrl}
                                    placeholder="API URL (e.g. http://192.168.1.5:5000)"
                                    placeholderTextColor={colors.textMuted}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    onPress={saveUrl}
                                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                                >
                                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>SAVE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={clearLogs} style={styles.headerButton}>
                                <Icon icon="bx:trash" color={colors.danger} size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.headerButton}>
                                <Icon icon="bx:x" color={colors.textPrimary} size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        data={logs}
                        keyExtractor={(item) => item.id}
                        renderItem={renderLogItem}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={{ color: colors.textMuted }}>No logs yet</Text>
                            </View>
                        }
                    />

                    {/* Log Details Modal */}
                    <Modal visible={!!selectedLog} animationType="fade" transparent={true}>
                        <View style={styles.detailsOverlay}>
                            <View style={[styles.detailsContainer, { backgroundColor: colors.surface }]}>
                                <View style={[styles.detailsHeader, { borderBottomColor: colors.borderLight }]}>
                                    <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>
                                        Log Details
                                    </Text>
                                    <TouchableOpacity onPress={() => setSelectedLog(null)}>
                                        <Icon icon="bx:x" color={colors.textPrimary} size={24} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView style={styles.detailsContent}>
                                    <DetailRow label="Type" value={selectedLog?.type} colors={colors} />
                                    <DetailRow label="URL" value={selectedLog?.url} colors={colors} />
                                    {selectedLog?.method && (
                                        <DetailRow label="Method" value={selectedLog?.method} colors={colors} />
                                    )}
                                    {selectedLog?.status && (
                                        <DetailRow label="Status" value={selectedLog?.status} colors={colors} />
                                    )}
                                    {selectedLog?.message && (
                                        <DetailRow label="Error Message" value={selectedLog?.message} colors={colors} />
                                    )}

                                    {selectedLog?.data && (
                                        <View style={styles.dataContainer}>
                                            <Text style={[styles.label, { color: colors.textMuted }]}>Data:</Text>
                                            <View
                                                style={[
                                                    styles.jsonContainer,
                                                    { backgroundColor: isDark ? "#121212" : "#f8f9fa" },
                                                ]}
                                            >
                                                <Text style={[styles.jsonText, { color: isDark ? "#e0e0e0" : "#333" }]}>
                                                    {JSON.stringify(selectedLog.data, null, 2)}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {selectedLog?.headers && (
                                        <View style={styles.dataContainer}>
                                            <Text style={[styles.label, { color: colors.textMuted }]}>Headers:</Text>
                                            <View
                                                style={[
                                                    styles.jsonContainer,
                                                    { backgroundColor: isDark ? "#121212" : "#f8f9fa" },
                                                ]}
                                            >
                                                <Text style={[styles.jsonText, { color: isDark ? "#e0e0e0" : "#333" }]}>
                                                    {JSON.stringify(selectedLog.headers, null, 2)}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                </SafeAreaView>
            </Modal>
        </>
    );
};

const DetailRow = ({ label, value, colors }) => (
    <View style={styles.detailRow}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}:</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    fab: {
        position: "absolute",
        bottom: 100,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 9999,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 8,
    },
    urlEditor: {
        flexDirection: "row",
        alignItems: "center",
    },
    urlInput: {
        flex: 1,
        height: 32,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        fontSize: 12,
        marginRight: 8,
    },
    saveBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerButton: {
        marginLeft: 16,
    },
    logItem: {
        padding: 12,
        borderBottomWidth: 1,
    },
    logHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    logType: {
        fontSize: 12,
    },
    logTime: {
        fontSize: 12,
    },
    logUrl: {
        fontSize: 14,
        fontFamily: "System", // Use monospace if possible
    },
    logStatus: {
        fontSize: 12,
        marginTop: 4,
    },
    emptyContainer: {
        padding: 40,
        alignItems: "center",
    },
    detailsOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    detailsContainer: {
        borderRadius: 12,
        maxHeight: "80%",
        overflow: "hidden",
    },
    detailsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },
    detailsContent: {
        padding: 16,
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    label: {
        width: 80,
        fontSize: 14,
    },
    value: {
        flex: 1,
        fontSize: 14,
    },
    dataContainer: {
        marginTop: 16,
        marginBottom: 8,
    },
    jsonContainer: {
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    jsonText: {
        fontSize: 12,
        fontFamily: "System",
    },
});

export default ApiLogViewer;
