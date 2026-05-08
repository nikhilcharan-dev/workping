// Bootstrap-equivalent color palette for React Native
export const lightColors = {
    // Primary palette
    primary: "#3762ea",
    primarySoft: "#3762ea1a",
    secondary: "#68798b",
    secondarySoft: "#68798b1a",
    success: "#1ea97c",
    successSoft: "#1ea97c1a",
    danger: "#f1556c",
    dangerSoft: "#f1556c1a",
    warning: "#f7b84b",
    warningSoft: "#f7b84b1a",
    info: "#4fc6e1",
    infoSoft: "#4fc6e11a",
    dark: "#343a40",
    darkSoft: "#343a401a",
    light: "#eef2f7",
    lightSoft: "#eef2f71a",
    purple: "#6b5eae",
    purpleSoft: "#6b5eae1a",
    pink: "#e83e8c",
    pinkSoft: "#e83e8c1a",
    orange: "#fd7e14",
    orangeSoft: "#fd7e141a",
    link: "#3762ea",

    // Background colors
    background: "#f2f4f7",
    bodyBg: "#f2f4f7",
    surface: "#ffffff",
    card: "#ffffff",
    cardBg: "#ffffff",
    cardBorder: "#e9ecef",

    // Text colors
    text: "#6c757d",
    textPrimary: "#343a40",
    textSecondary: "#6c757d",
    textMuted: "#adb5bd",
    textWhite: "#ffffff",

    // Border colors
    border: "#dee2e6",
    borderLight: "#e9ecef",
    divider: "#e9ecef",

    // Topbar
    topbar: "#ffffff",
    topbarBg: "#ffffff",
    topbarText: "#6c757d",

    // Sidebar/Menu
    menuBg: "#ffffff",
    menuText: "#6c757d",
    menuTextActive: "#3762ea",
    menuBgActive: "#3762ea0d",
    menuBorder: "#e9ecef",

    // Status bar
    statusBar: "#ffffff",

    // Input
    inputBg: "#ffffff",
    inputBorder: "#ced4da",
    inputText: "#495057",
    inputPlaceholder: "#adb5bd",

    // Shadow
    shadow: "rgba(0,0,0,0.08)",
    shadowMedium: "rgba(0,0,0,0.12)",
};

export const darkColors = {
    ...lightColors,
    // Override for dark theme
    background: "#1a1d21",
    bodyBg: "#1a1d21",
    surface: "#222528",
    card: "#282c31",
    cardBg: "#282c31",
    cardBorder: "#3a3f47",

    text: "#adb5bd",
    textPrimary: "#e9ecef",
    textSecondary: "#adb5bd",
    textMuted: "#6c757d",

    border: "#3a3f47",
    borderLight: "#2d3238",
    divider: "#3a3f47",

    topbar: "#222528",
    topbarBg: "#222528",
    topbarText: "#adb5bd",

    menuBg: "#222528",
    menuText: "#adb5bd",
    menuTextActive: "#3762ea",
    menuBgActive: "#3762ea1a",
    menuBorder: "#3a3f47",

    statusBar: "#1a1d21",

    inputBg: "#282c31",
    inputBorder: "#3a3f47",
    inputText: "#e9ecef",
    inputPlaceholder: "#6c757d",

    light: "#3a3f47",
    lightSoft: "#3a3f471a",

    link: "#5b86ff",
    shadow: "rgba(0,0,0,0.2)",
    shadowMedium: "rgba(0,0,0,0.3)",
};

export const getVariantColor = (variant, colors) => {
    const map = {
        primary: colors.primary,
        secondary: colors.secondary,
        success: colors.success,
        danger: colors.danger,
        warning: colors.warning,
        info: colors.info,
        dark: colors.dark,
        light: colors.light,
        purple: colors.purple,
        pink: colors.pink,
        orange: colors.orange,
        link: colors.link,
    };
    return map[variant] || colors.primary;
};

export const getVariantSoftColor = (variant, colors) => {
    const map = {
        primary: colors.primarySoft,
        secondary: colors.secondarySoft,
        success: colors.successSoft,
        danger: colors.dangerSoft,
        warning: colors.warningSoft,
        info: colors.infoSoft,
        dark: colors.darkSoft,
        light: colors.lightSoft,
        purple: colors.purpleSoft,
        pink: colors.pinkSoft,
        orange: colors.orangeSoft,
        link: colors.primarySoft,
    };
    return map[variant] || colors.primarySoft;
};
