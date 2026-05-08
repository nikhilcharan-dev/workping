import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthContext } from "@/context/useAuthContext";
import { navigationRef } from "@/helpers/navigationRef";
import UserNavigator from "./UserNavigator";
import AdminNavigator from "./AdminNavigator";
import AuthNavigator from "./AuthNavigator";
import { ActivityIndicator, View } from "react-native";

const RootStack = createNativeStackNavigator();

const RootNavigator = () => {
    const { isAuthenticated, isLoading, user } = useAuthContext();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const isAdmin = user?.role === "admin";

    return (
        <NavigationContainer ref={navigationRef}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                ) : isAdmin ? (
                    <RootStack.Screen name="Admin" component={AdminNavigator} />
                ) : (
                    <RootStack.Screen name="User" component={UserNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
