import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SignInScreen from "@/screens/auth/SignInScreen";
import SignUpScreen from "@/screens/auth/SignUpScreen";
import ResetPasswordScreen from "@/screens/auth/ResetPasswordScreen";
import LockScreen from "@/screens/auth/LockScreen";

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SignIn">
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="LockScreen" component={LockScreen} />
        </Stack.Navigator>
    );
};

export default AuthNavigator;
