import { useState, useCallback } from "react";

const useToggle = (defaultValue = false) => {
    const [isTrue, setIsTrue] = useState(defaultValue);

    const toggle = useCallback(() => setIsTrue((prev) => !prev), []);
    const setTrue = useCallback(() => setIsTrue(true), []);
    const setFalse = useCallback(() => setIsTrue(false), []);

    return { isTrue, toggle, setTrue, setFalse };
};

export default useToggle;
