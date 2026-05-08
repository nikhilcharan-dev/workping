import { createContext, useContext, useCallback, useMemo, useState } from "react";
import useStorage from "@/hooks/useStorage";

const ThemeContext = createContext(undefined);

const useLayoutContext = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useLayoutContext can only be used within LayoutProvider");
    }
    return context;
};

const LayoutProvider = ({ children }) => {
    const INIT_STATE = {
        theme: "light",
        topbarTheme: "light",
        menu: {
            theme: "light",
            size: "default",
        },
    };

    const [settings, setSettings] = useStorage("__WORKPING_CONFIG__", INIT_STATE);

    const [offcanvasStates, setOffcanvasStates] = useState({
        showThemeCustomizer: false,
        showActivityStream: false,
        showDrawer: false,
    });

    const updateSettings = useCallback(
        (_newSettings) => setSettings((prev) => ({ ...prev, ..._newSettings })),
        [setSettings]
    );

    const changeTheme = (newTheme) => updateSettings({ theme: newTheme });

    const changeTopbarTheme = (newTheme) => updateSettings({ topbarTheme: newTheme });

    const changeMenuTheme = useCallback(
        (newTheme) => setSettings((prev) => ({ ...prev, menu: { ...prev.menu, theme: newTheme } })),
        [setSettings]
    );

    const changeMenuSize = useCallback(
        (newSize) => setSettings((prev) => ({ ...prev, menu: { ...prev.menu, size: newSize } })),
        [setSettings]
    );

    const toggleThemeCustomizer = () =>
        setOffcanvasStates((prev) => ({
            ...prev,
            showThemeCustomizer: !prev.showThemeCustomizer,
        }));

    const toggleActivityStream = () =>
        setOffcanvasStates((prev) => ({
            ...prev,
            showActivityStream: !prev.showActivityStream,
        }));

    const toggleDrawer = useCallback(() => {
        setOffcanvasStates((prev) => ({
            ...prev,
            showDrawer: !prev.showDrawer,
        }));
    }, []);

    const themeCustomizer = {
        open: offcanvasStates.showThemeCustomizer,
        toggle: toggleThemeCustomizer,
    };

    const activityStream = {
        open: offcanvasStates.showActivityStream,
        toggle: toggleActivityStream,
    };

    const resetSettings = () => updateSettings(INIT_STATE);

    return (
        <ThemeContext.Provider
            value={useMemo(
                () => ({
                    ...settings,
                    themeMode: settings.theme,
                    changeTheme,
                    changeTopbarTheme,
                    changeMenu: {
                        theme: changeMenuTheme,
                        size: changeMenuSize,
                    },
                    themeCustomizer,
                    activityStream,
                    toggleDrawer,
                    resetSettings,
                }),
                [settings, offcanvasStates]
            )}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export { LayoutProvider, useLayoutContext };
