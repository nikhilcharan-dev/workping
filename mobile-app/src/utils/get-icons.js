export const getFileExtensionIcon = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    const map = {
        fig: "bxl:figma",
        pdf: "bxs:file-pdf",
        ai: "bxs:file-image",
        doc: "bxs:file-doc",
        docx: "bxs:file-doc",
        psd: "bxs:file-image",
        zip: "bxs:file-archive",
        jpg: "bxs:file-image",
        png: "bxs:file-image",
        svg: "bxs:file-image",
        mp3: "bxs:music",
        mp4: "bxs:video",
    };
    return map[ext] || "bxs:file-blank";
};

export const getActivityIcon = (type) => {
    const map = {
        task: "iconamoon:check-circle-1-duotone",
        design: "iconamoon:pen-duotone",
        achievement: "iconamoon:trophy-duotone",
    };
    return map[type] || "iconamoon:notification-duotone";
};

export const getEventIcon = (type) => {
    const map = {
        celebration: "iconamoon:gift-duotone",
        togetherness: "iconamoon:profile-group-duotone",
        professional: "iconamoon:briefcase-duotone",
        other: "iconamoon:calendar-2-duotone",
    };
    return map[type] || "iconamoon:calendar-2-duotone";
};
