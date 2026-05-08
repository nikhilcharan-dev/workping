import React from "react";
import { Modal, View, TouchableWithoutFeedback, StyleSheet, Alert } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

import DrawerContent from "@/components/layout/DrawerContent";
import { DrawerProvider, useDrawerContext } from "@/context/useDrawerContext";
import { useAuthContext } from "@/context/useAuthContext";

import UserDashboardScreen from "@/screens/user/UserDashboardScreen";
import AttendanceScreen from "@/screens/AttendanceScreen";
import FaceCaptureScreen from "@/screens/FaceCaptureScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import ProjectsScreen from "@/screens/ProjectsScreen";
import ProjectDetailsScreen from "@/screens/ProjectDetailsScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import WelcomeScreen from "@/screens/pages/WelcomeScreen";
import FAQsScreen from "@/screens/pages/FAQsScreen";
import AboutUsScreen from "@/screens/pages/AboutUsScreen";
import ContactUsScreen from "@/screens/pages/ContactUsScreen";
import OurTeamScreen from "@/screens/pages/OurTeamScreen";
import TimelineScreen from "@/screens/pages/TimelineScreen";
import FaceRegistrationScreen from "@/screens/FaceRegistrationScreen";
import AnalyticsScreen from "@/screens/dashboard/AnalyticsScreen";

const Tab = createBottomTabNavigator();
const AttendanceNav = createNativeStackNavigator();
const UserStack = createNativeStackNavigator();

const LogoutScreen = () => null;

const AttendanceStack = () => (
    <AttendanceNav.Navigator screenOptions={{ headerShown: false }}>
        <AttendanceNav.Screen name="AttendanceHome" component={AttendanceScreen} />
        <AttendanceNav.Screen
            name="FaceCapture"
            component={FaceCaptureScreen}
            options={{ animation: "slide_from_bottom" }}
        />
    </AttendanceNav.Navigator>
);

const BottomTabNavigator = () => {
    const { colors } = useTheme();
    const { removeSession } = useAuthContext();
    const insets = useSafeAreaInsets();

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => setTimeout(removeSession, 300) },
        ]);
    };

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 64 + insets.bottom,
                    paddingBottom: 10 + insets.bottom,
                    paddingTop: 6,
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
                tabBarIcon: ({ color, focused }) => {
                    const icons = {
                        Dashboard: focused ? "home" : "home-outline",
                        Attendance: focused ? "person-circle" : "person-circle-outline",
                        Profile: focused ? "person" : "person-outline",
                        Logout: focused ? "log-out" : "log-out-outline",
                    };
                    return <Ionicons name={icons[route.name]} size={22} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={UserDashboardScreen} options={{ tabBarLabel: "Home" }} />
            <Tab.Screen name="Attendance" component={AttendanceStack} options={{ tabBarLabel: "Attendance" }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "Profile" }} />
            <Tab.Screen
                name="Logout"
                component={LogoutScreen}
                options={{ tabBarLabel: "Logout" }}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault();
                        handleLogout();
                    },
                }}
            />
        </Tab.Navigator>
    );
};

const SidebarOverlay = () => {
    const { colors } = useTheme();
    const { isOpen, closeDrawer } = useDrawerContext();

    return (
        <Modal visible={isOpen} transparent animationType="none" onRequestClose={closeDrawer}>
            <View style={styles.overlay}>
                <View style={[styles.sidebar, { backgroundColor: colors.menuBg }]}>
                    <DrawerContent />
                </View>
                <TouchableWithoutFeedback onPress={closeDrawer}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>
            </View>
        </Modal>
    );
};

const MainLayout = () => (
    <View style={{ flex: 1 }}>
        <BottomTabNavigator />
        <SidebarOverlay />
    </View>
);

const UserNavigator = () => {
    return (
        <DrawerProvider>
            <UserStack.Navigator screenOptions={{ headerShown: false }}>
                <UserStack.Screen name="Main" component={MainLayout} />
                <UserStack.Screen name="Projects" component={ProjectsScreen} />
                <UserStack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
                <UserStack.Screen name="Notifications" component={NotificationsScreen} />
                <UserStack.Screen name="Welcome" component={WelcomeScreen} />
                <UserStack.Screen name="FAQs" component={FAQsScreen} />
                <UserStack.Screen name="AboutUs" component={AboutUsScreen} />
                <UserStack.Screen name="ContactUs" component={ContactUsScreen} />
                <UserStack.Screen name="OurTeam" component={OurTeamScreen} />
                <UserStack.Screen name="Timeline" component={TimelineScreen} />
                <UserStack.Screen name="Analytics" component={AnalyticsScreen} />
                <UserStack.Screen
                    name="FaceRegistration"
                    component={FaceRegistrationScreen}
                    options={{ animation: "slide_from_bottom" }}
                />
            </UserStack.Navigator>
        </DrawerProvider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: "row",
    },
    sidebar: {
        width: 280,
    },
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
});

export default UserNavigator;
