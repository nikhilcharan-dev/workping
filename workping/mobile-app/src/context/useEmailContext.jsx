import { createContext, useCallback, useContext, useMemo, useState } from "react";

const EmailContext = createContext(undefined);

export const useEmailContext = () => {
    const context = useContext(EmailContext);
    if (!context) {
        throw new Error("useEmailContext can only be used within EmailProvider");
    }
    return context;
};

export const EmailProvider = ({ children }) => {
    const [activeLabel, setActiveLabel] = useState("Primary");
    const [activeMail, setActiveMail] = useState("2001");
    const [offcanvasStates, setOffcanvasStates] = useState({
        showNavigationMenu: false,
        showEmailDetails: false,
        showComposeEmail: false,
    });

    const changeActiveLabel = useCallback((newLabel) => setActiveLabel(newLabel), []);

    const toggle = useCallback((key) => () => setOffcanvasStates((prev) => ({ ...prev, [key]: !prev[key] })), []);

    const toggleEmailDetails = useMemo(() => toggle("showEmailDetails"), [toggle]);

    const changeActiveMail = useCallback(
        (newMail) => {
            setActiveMail(newMail);
            toggleEmailDetails();
        },
        [toggleEmailDetails]
    );

    const navigationBar = useMemo(
        () => ({ open: offcanvasStates.showNavigationMenu, toggle: toggle("showNavigationMenu") }),
        [offcanvasStates.showNavigationMenu, toggle]
    );
    const emailDetails = useMemo(
        () => ({ open: offcanvasStates.showEmailDetails, toggle: toggleEmailDetails }),
        [offcanvasStates.showEmailDetails, toggleEmailDetails]
    );
    const composeEmail = useMemo(
        () => ({ open: offcanvasStates.showComposeEmail, toggle: toggle("showComposeEmail") }),
        [offcanvasStates.showComposeEmail, toggle]
    );

    const value = useMemo(
        () => ({
            activeLabel,
            changeActiveLabel,
            activeMail,
            changeActiveMail,
            navigationBar,
            emailDetails,
            composeEmail,
        }),
        [activeLabel, changeActiveLabel, activeMail, changeActiveMail, navigationBar, emailDetails, composeEmail]
    );

    return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};
