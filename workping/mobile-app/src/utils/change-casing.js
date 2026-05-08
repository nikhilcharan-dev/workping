export const snakeToTitleCase = (value) => {
    return value
        ? value.replace(/^_*(.)/, (_, c) => c.toUpperCase()).replace(/_+(.)/g, (_, c) => " " + c.toUpperCase())
        : "";
};

export const kebabToTitleCase = (value) => {
    return value
        ? value.replace(/^-*(.)/, (_, c) => c.toUpperCase()).replace(/-+(.)/g, (_, c) => " " + c.toUpperCase())
        : "";
};

export const toSentenceCase = (value) => {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
};

export const toAlphaNumber = (n) => {
    if (n == null || typeof n !== "number" || isNaN(n)) return "0";
    if (n < 1e3) return n.toString();
    if (n >= 1e3 && n < 1e6) return (n / 1e3).toFixed(1) + "K";
    if (n >= 1e6 && n < 1e9) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e9 && n < 1e12) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
    return n.toString();
};
