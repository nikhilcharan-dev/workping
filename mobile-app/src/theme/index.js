import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors } from "./colors";
import { spacing, borderRadius } from "./spacing";
import { typography } from "./typography";

const ThemeContext = createContext(undefined);

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
};

export const ThemeProvider = ({ themeMode, children }) => {
    const systemScheme = useColorScheme();
    const mode = themeMode || systemScheme || "light";
    const isDark = mode === "dark";
    const colors = isDark ? darkColors : lightColors;

    const value = useMemo(() => ({ colors, spacing, borderRadius, typography, isDark, mode }), [mode, isDark, colors]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export { lightColors, darkColors } from "./colors";
export { spacing, borderRadius } from "./spacing";
export { typography } from "./typography";
