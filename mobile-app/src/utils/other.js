export const getStockStatus = (quantity) => {
    if (quantity > 10) return { variant: "success", text: "In Stock" };
    if (quantity <= 10 && quantity > 0) return { variant: "warning", text: "Limited" };
    return { variant: "danger", text: "Out of Stock" };
};

export const getRatingVariant = (rating) => {
    if (rating >= 4) return "success";
    if (rating >= 3) return "warning";
    return "danger";
};

export const formatFileSize = (bytes, decimals = 2) => {
    if (bytes == null || bytes <= 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
