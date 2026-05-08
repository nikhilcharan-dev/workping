import { createRef } from "react";

// Shared navigation ref — allows navigating from outside React component tree
// (e.g. push notification tap handlers, auth interceptors)
export const navigationRef = createRef();

export const navigate = (name, params) => {
    if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate(name, params);
    }
};

export const getActiveRouteName = () => {
    return navigationRef.current?.getCurrentRoute()?.name;
};
