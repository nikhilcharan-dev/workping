import { createContext, useCallback, useContext, useMemo, useState } from "react";

const DrawerContext = createContext(undefined);

export function useDrawerContext() {
    const context = useContext(DrawerContext);
    if (!context) {
        throw new Error("useDrawerContext must be used within a DrawerProvider");
    }
    return context;
}

export function DrawerProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);

    const openDrawer = useCallback(() => setIsOpen(true), []);
    const closeDrawer = useCallback(() => setIsOpen(false), []);
    const toggleDrawer = useCallback(() => setIsOpen((v) => !v), []);

    const value = useMemo(
        () => ({
            isOpen,
            openDrawer,
            closeDrawer,
            toggleDrawer,
        }),
        [isOpen, openDrawer, closeDrawer, toggleDrawer]
    );

    return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}
