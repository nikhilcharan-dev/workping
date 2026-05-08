import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

const useViewPort = () => {
    const [dimensions, setDimensions] = useState({
        width: Dimensions.get("window").width,
        height: Dimensions.get("window").height,
    });

    useEffect(() => {
        const sub = Dimensions.addEventListener("change", ({ window }) => {
            setDimensions({ width: window.width, height: window.height });
        });
        return () => sub?.remove();
    }, []);

    return dimensions;
};

export default useViewPort;
