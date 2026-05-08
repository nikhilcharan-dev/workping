import { Platform } from "react-native";

const fontFamily = Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
});

export const typography = {
    fontFamily,
    h1: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
    h2: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
    h3: { fontSize: 20, fontWeight: "600", lineHeight: 26 },
    h4: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
    h5: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
    h6: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
    body1: { fontSize: 16, fontWeight: "400", lineHeight: 24 },
    body2: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
    small: { fontSize: 11, fontWeight: "400", lineHeight: 14 },
    button: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
    label: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
};
