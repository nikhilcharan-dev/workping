export const USER_MENU_ITEMS = [
    { key: "general", label: "GENERAL", isTitle: true },
    { key: "dashboard", icon: "iconamoon:home-duotone", label: "Dashboard", url: "/dashboard" },
    { key: "attendance", icon: "iconamoon:check-circle-1-duotone", label: "Attendance", url: "/attendance" },
    { key: "projects", icon: "iconamoon:component-duotone", label: "Projects", url: "/projects" },
    { key: "notifications", icon: "iconamoon:news-duotone", label: "Notifications", url: "/notifications" },

    { key: "account", label: "ACCOUNT", isTitle: true },
    { key: "profile", icon: "iconamoon:profile-duotone", label: "Profile", url: "/pages/profile" },

    {
        key: "extra-pages",
        icon: "iconamoon:file-document-duotone",
        label: "More Pages",
        children: [
            { key: "welcome", label: "Welcome", url: "/pages/welcome" },
            { key: "faqs", label: "FAQs", url: "/pages/faqs" },
            { key: "about-us", label: "About Us", url: "/pages/about-us" },
            { key: "contact-us", label: "Contact Us", url: "/pages/contact-us" },
            { key: "our-team", label: "Our Team", url: "/pages/our-team" },
            { key: "timeline", label: "Timeline", url: "/pages/timeline" },
        ],
    },
];

export const ADMIN_MENU_ITEMS = [
    { key: "general", label: "GENERAL", isTitle: true },
    { key: "dashboard", icon: "iconamoon:home-duotone", label: "Dashboard", url: "/dashboard" },
    { key: "attendance", icon: "iconamoon:check-circle-1-duotone", label: "Attendance", url: "/attendance" },
    { key: "notifications", icon: "iconamoon:news-duotone", label: "Notifications", url: "/notifications" },

    { key: "management", label: "MANAGEMENT", isTitle: true },
    { key: "employees", icon: "iconamoon:profile-duotone", label: "Employees", url: "/admin/employees" },
    { key: "projects", icon: "iconamoon:component-duotone", label: "Projects", url: "/projects" },

    { key: "account", label: "ACCOUNT", isTitle: true },
    { key: "profile", icon: "iconamoon:profile-duotone", label: "Profile", url: "/pages/profile" },

    {
        key: "extra-pages",
        icon: "iconamoon:file-document-duotone",
        label: "More Pages",
        children: [
            { key: "welcome", label: "Welcome", url: "/pages/welcome" },
            { key: "faqs", label: "FAQs", url: "/pages/faqs" },
            { key: "about-us", label: "About Us", url: "/pages/about-us" },
            { key: "contact-us", label: "Contact Us", url: "/pages/contact-us" },
            { key: "our-team", label: "Our Team", url: "/pages/our-team" },
            { key: "timeline", label: "Timeline", url: "/pages/timeline" },
        ],
    },
];

// Keep backward-compatible default export
export const MENU_ITEMS = USER_MENU_ITEMS;
