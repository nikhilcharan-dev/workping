import { useState, useCallback } from "react";
import * as ExpoClipboard from "expo-clipboard";

const useClipboard = () => {
    const [copiedText, setCopiedText] = useState(null);

    const copy = useCallback(async (text) => {
        try {
            await ExpoClipboard.setStringAsync(text);
            setCopiedText(text);
            return text;
        } catch (e) {
            setCopiedText(null);
            return null;
        }
    }, []);

    return [copiedText, copy];
};

export default useClipboard;
