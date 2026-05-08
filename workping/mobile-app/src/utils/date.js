export const addOrSubtractDaysFromDate = (days, add = true, startDate = new Date()) => {
    const date = new Date(startDate);
    if (add) date.setDate(date.getDate() + days);
    else date.setDate(date.getDate() - days);
    return date;
};

export const addOrSubtractMinutesFromDate = (minutes, add = true, startDate = new Date()) => {
    const date = new Date(startDate);
    if (add) date.setMinutes(date.getMinutes() + minutes);
    else date.setMinutes(date.getMinutes() - minutes);
    return date;
};

export const timeSince = (date) => {
    if (!date) return "";
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return "";
    const seconds = Math.floor((Date.now() - parsed.getTime()) / 1000);
    if (seconds < 0) return "just now";

    const units = [
        { value: 31536000, label: "year" },
        { value: 2592000, label: "month" },
        { value: 86400, label: "day" },
        { value: 3600, label: "hour" },
        { value: 60, label: "minute" },
    ];

    for (const unit of units) {
        const count = Math.floor(seconds / unit.value);
        if (count >= 1) return `${count} ${unit.label}${count > 1 ? "s" : ""} ago`;
    }
    return Math.floor(seconds) + " seconds ago";
};
