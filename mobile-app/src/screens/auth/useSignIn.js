import { yupResolver } from "@hookform/resolvers/yup";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { useAuthContext } from "@/context/useAuthContext";
import { useNotificationContext } from "@/context/useNotificationContext";
import httpClient from "@/helpers/httpClient";
import { API_BASE_URL } from "@/helpers/config";
import { playLogin, playError } from "@/services/soundService";

const loginFormSchema = yup.object({
    email: yup.string().email("Please enter a valid email").required("Please enter your email"),
    password: yup.string().required("Please enter your password"),
});

const useSignIn = (navigation, role = "admin") => {
    const [loading, setLoading] = useState(false);
    const { saveSession } = useAuthContext();
    const { showNotification } = useNotificationContext();
    const roleRef = useRef(role);
    roleRef.current = role;

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(loginFormSchema),
    });

    const login = handleSubmit(async (values) => {
        setLoading(true);
        try {
            const currentRole = roleRef.current;
            const endpoint = currentRole === "admin" ? "/api/admin/auth/login" : "/api/auth/login";

            const payload =
                currentRole === "admin"
                    ? { email: values.email, password: values.password }
                    : { userEmail: values.email, password: values.password };

            const res = await httpClient.post(endpoint, payload);
            console.log("[useSignIn] Login Response Data:", res.data);

            const sessionData = res.data?.data ?? res.data;
            if (sessionData?.token) {
                console.log("[useSignIn] Token found, saving session...");
                playLogin();
                await saveSession({
                    ...sessionData,
                    role: currentRole,
                });
                showNotification({
                    message: "Successfully logged in. Redirecting....",
                    variant: "success",
                });
            } else {
                showNotification({
                    message: res.data?.message || "Login succeeded but no token received",
                    variant: "warning",
                });
            }
        } catch (e) {
            playError();
            showNotification({
                message: e.response?.data?.message || e.response?.data?.error || "Login failed",
                variant: "danger",
            });
        } finally {
            setLoading(false);
        }
    });

    return { loading, login, control };
};

export default useSignIn;
