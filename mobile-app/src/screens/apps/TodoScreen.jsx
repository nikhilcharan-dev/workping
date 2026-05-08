import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";

const initialTasks = [
    { id: "1", text: "Review project proposal", completed: true, priority: "high" },
    { id: "2", text: "Update dashboard design", completed: false, priority: "medium" },
    { id: "3", text: "Send weekly report", completed: false, priority: "high" },
    { id: "4", text: "Fix reported bugs", completed: false, priority: "low" },
    { id: "5", text: "Team standup meeting", completed: true, priority: "medium" },
    { id: "6", text: "Prepare presentation slides", completed: false, priority: "high" },
    { id: "7", text: "Database backup", completed: true, priority: "low" },
    { id: "8", text: "Client call at 3 PM", completed: false, priority: "medium" },
];

const TodoScreen = () => {
    const { colors } = useTheme();
    const [tasks, setTasks] = useState(initialTasks);
    const [newTask, setNewTask] = useState("");
    const [filter, setFilter] = useState("all");

    const toggleTask = (id) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    };

    const addTask = () => {
        if (!newTask.trim()) return;
        setTasks((prev) => [
            { id: Date.now().toString(), text: newTask.trim(), completed: false, priority: "medium" },
            ...prev,
        ]);
        setNewTask("");
    };

    const deleteTask = (id) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
    };

    const filteredTasks =
        filter === "completed"
            ? tasks.filter((t) => t.completed)
            : filter === "pending"
              ? tasks.filter((t) => !t.completed)
              : tasks;

    const priorityColors = {
        high: colors.danger,
        medium: colors.warning,
        low: colors.success,
    };

    const completedCount = tasks.filter((t) => t.completed).length;

    return (
        <ScreenWrapper>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Todo</Text>
            <Text style={[styles.breadcrumb, { color: colors.textSecondary }]}>
                {completedCount}/{tasks.length} completed
            </Text>

            {/* Add Task */}
            <Card>
                <Card.Body>
                    <View style={styles.addRow}>
                        <TextInput
                            style={[
                                styles.addInput,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: colors.inputBorder,
                                    color: colors.inputText,
                                },
                            ]}
                            placeholder="Add a new task..."
                            placeholderTextColor={colors.inputPlaceholder}
                            value={newTask}
                            onChangeText={setNewTask}
                            onSubmitEditing={addTask}
                        />
                        <TouchableOpacity
                            style={[styles.addBtn, { backgroundColor: colors.primary }]}
                            onPress={addTask}
                        >
                            <Ionicons name="add" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </Card.Body>
            </Card>

            {/* Filters */}
            <View style={styles.filterRow}>
                {["all", "pending", "completed"].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterBtn,
                            {
                                backgroundColor: filter === f ? colors.primary : colors.cardBg,
                                borderColor: filter === f ? colors.primary : colors.border,
                            },
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.textSecondary }]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Task List */}
            <Card>
                <Card.Body style={{ paddingHorizontal: 0 }}>
                    {filteredTasks.map((task) => (
                        <View key={task.id} style={[styles.taskRow, { borderBottomColor: colors.border }]}>
                            <TouchableOpacity onPress={() => toggleTask(task.id)} style={styles.checkbox}>
                                <Ionicons
                                    name={task.completed ? "checkbox" : "square-outline"}
                                    size={22}
                                    color={task.completed ? colors.success : colors.textMuted}
                                />
                            </TouchableOpacity>
                            <View style={styles.taskInfo}>
                                <Text
                                    style={[
                                        styles.taskText,
                                        { color: colors.textPrimary },
                                        task.completed && styles.taskDone,
                                    ]}
                                >
                                    {task.text}
                                </Text>
                                <View
                                    style={[styles.priorityDot, { backgroundColor: priorityColors[task.priority] }]}
                                />
                            </View>
                            <TouchableOpacity onPress={() => deleteTask(task.id)}>
                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {filteredTasks.length === 0 && (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks found</Text>
                    )}
                </Card.Body>
            </Card>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    pageTitle: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
    breadcrumb: { fontSize: 13, marginBottom: 16 },
    addRow: { flexDirection: "row", gap: 8 },
    addInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    filterRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterText: { fontSize: 13, fontWeight: "500" },
    taskRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    checkbox: { marginRight: 12 },
    taskInfo: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    taskText: { fontSize: 14, flex: 1 },
    taskDone: { textDecorationLine: "line-through", opacity: 0.5 },
    priorityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, marginRight: 8 },
    emptyText: { textAlign: "center", fontSize: 14, paddingVertical: 24 },
});

export default TodoScreen;
