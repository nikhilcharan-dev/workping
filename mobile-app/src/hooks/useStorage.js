import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useStorage = (key, initialValue, override = false) => {
    const [storedValue, setStoredValue] = useState(initialValue);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                if (override) {
                    await AsyncStorage.setItem(key, JSON.stringify(initialValue));
                    if (active) setStoredValue(initialValue);
                    return;
                }
                const item = await AsyncStorage.getItem(key);
                if (active && item) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (e) {
                // Fall back to initial value
            }
        })();
        return () => {
            active = false;
        };
    }, [key]);

    const setValue = useCallback(
        async (value) => {
            try {
                setStoredValue((prev) => {
                    const valueToStore = value instanceof Function ? value(prev) : value;
                    AsyncStorage.setItem(key, JSON.stringify(valueToStore)).catch(() => {});
                    return valueToStore;
                });
            } catch (e) {
                // Save failed
            }
        },
        [key]
    );

    return [storedValue, setValue];
};

export default useStorage;
