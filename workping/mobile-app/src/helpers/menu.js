import { USER_MENU_ITEMS, ADMIN_MENU_ITEMS } from "@/assets/data/menu-items";

export const getMenuItems = (role = "user") => {
    return role === "admin" ? ADMIN_MENU_ITEMS : USER_MENU_ITEMS;
};

export const findAllParent = (menuItems, menuItem) => {
    let parents = [];
    const parent = findMenuItem(menuItems, menuItem.parentKey);
    if (parent) {
        parents.push(parent.key);
        if (parent.parentKey) {
            parents = [...parents, ...findAllParent(menuItems, parent)];
        }
    }
    return parents;
};

export const getMenuItemFromURL = (items, url) => {
    if (items instanceof Array) {
        for (const item of items) {
            const found = getMenuItemFromURL(item, url);
            if (found) return found;
        }
    } else {
        if (items.url === url) return items;
        if (items.children) return getMenuItemFromURL(items.children, url);
    }
    return undefined;
};

export const findMenuItem = (menuItems, key) => {
    for (const item of menuItems) {
        if (item.key === key) return item;
        if (item.children) {
            const found = findMenuItem(item.children, key);
            if (found) return found;
        }
    }
    return undefined;
};
