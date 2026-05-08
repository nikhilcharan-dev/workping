import React from "react";
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from "@expo/vector-icons";

// Map iconamoon/bx icon names to Expo vector icon equivalents
const iconMap = {
    // Navigation & UI
    "iconamoon:home-duotone": { lib: "Ionicons", name: "home" },
    "iconamoon:search-duotone": { lib: "Ionicons", name: "search" },
    "iconamoon:notification-duotone": { lib: "Ionicons", name: "notifications" },
    "iconamoon:settings-duotone": { lib: "Ionicons", name: "settings" },
    "iconamoon:menu-burger-horizontal": { lib: "Ionicons", name: "menu" },
    "iconamoon:history-duotone": { lib: "Ionicons", name: "time" },
    "iconamoon:apps": { lib: "Ionicons", name: "apps" },
    "iconamoon:mode-light-duotone": { lib: "Ionicons", name: "sunny" },
    "iconamoon:mode-dark-duotone": { lib: "Ionicons", name: "moon" },
    "iconamoon:arrow-left-4-square-duotone": { lib: "Ionicons", name: "arrow-back" },
    "iconamoon:heart-duotone": { lib: "Ionicons", name: "heart" },
    "iconamoon:check-circle-1-duotone": { lib: "Ionicons", name: "checkmark-circle" },
    "iconamoon:pen-duotone": { lib: "Ionicons", name: "pencil" },
    "iconamoon:trophy-duotone": { lib: "Ionicons", name: "trophy" },
    "iconamoon:gift-duotone": { lib: "Ionicons", name: "gift" },
    "iconamoon:profile-group-duotone": { lib: "Ionicons", name: "people" },
    "iconamoon:calendar-1-duotone": { lib: "Ionicons", name: "calendar" },
    "iconamoon:calendar-2-duotone": { lib: "Ionicons", name: "calendar" },
    "iconamoon:location-pin-duotone": { lib: "Ionicons", name: "location" },
    "iconamoon:lightning-1-duotone": { lib: "Ionicons", name: "flash" },
    "iconamoon:unavailable-duotone": { lib: "Ionicons", name: "close-circle" },
    "iconamoon:folder-add-duotone": { lib: "Ionicons", name: "folder" },

    // Apps
    "iconamoon:shopping-bag-duotone": { lib: "Ionicons", name: "bag" },
    "iconamoon:comment-dots-duotone": { lib: "Ionicons", name: "chatbubbles" },
    "iconamoon:email-duotone": { lib: "Ionicons", name: "mail" },
    "iconamoon:ticket-duotone": { lib: "Ionicons", name: "checkbox" },
    "iconamoon:squinting-face-duotone": { lib: "Ionicons", name: "people-circle" },
    "iconamoon:profile-circle-duotone": { lib: "Ionicons", name: "person-circle" },
    "iconamoon:invoice-duotone": { lib: "Ionicons", name: "document-text" },
    "iconamoon:copy-duotone": { lib: "Ionicons", name: "copy" },
    "iconamoon:lock-duotone": { lib: "Ionicons", name: "lock-closed" },
    "iconamoon:briefcase-duotone": { lib: "Ionicons", name: "briefcase" },
    "iconamoon:component-duotone": { lib: "Ionicons", name: "cube" },
    "iconamoon:3d-duotone": { lib: "Ionicons", name: "bar-chart" },
    "iconamoon:cheque-duotone": { lib: "Ionicons", name: "document" },
    "iconamoon:box-duotone": { lib: "Ionicons", name: "grid" },
    "iconamoon:badge-duotone": { lib: "Ionicons", name: "ribbon" },

    // Boxicons equivalents
    "bx:right-arrow-alt": { lib: "Ionicons", name: "arrow-forward" },
    "bx:chevron-right": { lib: "Ionicons", name: "chevron-forward" },
    "bx:chevron-down": { lib: "Ionicons", name: "chevron-down" },
    "bx:chevron-up": { lib: "Ionicons", name: "chevron-up" },
    "bx:user-circle": { lib: "Ionicons", name: "person-circle" },
    "bx:message-dots": { lib: "Ionicons", name: "chatbubble-ellipses" },
    "bx:wallet": { lib: "Ionicons", name: "wallet" },
    "bx:help-circle": { lib: "Ionicons", name: "help-circle" },
    "bx:lock": { lib: "Ionicons", name: "lock-closed" },
    "bx:log-out": { lib: "Ionicons", name: "log-out" },
    "bx:download": { lib: "Ionicons", name: "download" },
    "bx:x": { lib: "Ionicons", name: "close" },
    "bx:check": { lib: "Ionicons", name: "checkmark" },
    "bx:plus": { lib: "Ionicons", name: "add" },
    "bx:trash": { lib: "Ionicons", name: "trash" },
    "bx:edit": { lib: "Ionicons", name: "create" },
    "bx:star": { lib: "Ionicons", name: "star" },
    "bx:envelope": { lib: "Ionicons", name: "mail" },
    "bx:phone": { lib: "Ionicons", name: "call" },
    "bx:map": { lib: "Ionicons", name: "map" },
    "bxl:google": { lib: "Ionicons", name: "logo-google" },
    "bxl:facebook": { lib: "Ionicons", name: "logo-facebook" },
    "bxl:github": { lib: "Ionicons", name: "logo-github" },

    // File type icons
    "bxs:file-pdf": { lib: "Ionicons", name: "document" },
    "bxs:file-doc": { lib: "Ionicons", name: "document-text" },
    "bxs:file-image": { lib: "Ionicons", name: "image" },
    "bxs:file-archive": { lib: "Ionicons", name: "archive" },
    "bxs:file-blank": { lib: "Ionicons", name: "document" },
    "bxs:music": { lib: "Ionicons", name: "musical-notes" },
    "bxs:video": { lib: "Ionicons", name: "videocam" },
    "bxl:figma": { lib: "Ionicons", name: "color-palette" },

    // Eye icons for password toggle
    "iconamoon:eye-duotone": { lib: "Ionicons", name: "eye" },
    "iconamoon:eye-off-duotone": { lib: "Ionicons", name: "eye-off" },
};

const Icon = ({ icon, size = 20, color = "#6c757d", style, ...props }) => {
    const mapped = iconMap[icon];

    if (!mapped) {
        // Fallback: try to parse as ionicons
        return <Ionicons name="help-circle-outline" size={size} color={color} style={style} />;
    }

    switch (mapped.lib) {
        case "MaterialCommunityIcons":
            return <MaterialCommunityIcons name={mapped.name} size={size} color={color} style={style} {...props} />;
        case "Feather":
            return <Feather name={mapped.name} size={size} color={color} style={style} {...props} />;
        case "FontAwesome5":
            return <FontAwesome5 name={mapped.name} size={size} color={color} style={style} {...props} />;
        default:
            return <Ionicons name={mapped.name} size={size} color={color} style={style} {...props} />;
    }
};

export default Icon;
