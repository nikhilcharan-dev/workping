import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated, Easing } from "react-native";
import Svg, { Ellipse, Defs, Mask, Rect, LinearGradient, Stop } from "react-native-svg";

const { width: W, height: H } = Dimensions.get("window");
const OVAL_W = W * 0.58;
const OVAL_H = OVAL_W * 1.35;
const CORNER_SIZE = 24;

const QUALITY_COLORS = {
    good: "#00D4AA",
    fair: "#F59E0B",
    poor: "#7B8FA3",
};

const FaceGuideOverlay = ({ quality = "poor", isCapturing = false }) => {
    const borderColor = QUALITY_COLORS[quality] || QUALITY_COLORS.poor;

    const scanPos = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const flashOpacity = useRef(new Animated.Value(0)).current;

    // Scan + pulse
    useEffect(() => {
        scanPos.setValue(0);
        const scan = Animated.loop(
            Animated.sequence([
                Animated.timing(scanPos, {
                    toValue: 1,
                    duration: 2800,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(scanPos, {
                    toValue: 0,
                    duration: 2800,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        scan.start();

        let pulse;
        if (quality === "good") {
            pulseScale.setValue(1);
            pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseScale, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            );
            pulse.start();
        } else {
            Animated.timing(pulseScale, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        }

        return () => {
            scan.stop();
            if (pulse) pulse.stop();
        };
    }, [quality]);

    // Flash on capture
    useEffect(() => {
        if (isCapturing) {
            Animated.sequence([
                Animated.timing(flashOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
                Animated.timing(flashOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
            ]).start();
        }
    }, [isCapturing]);

    const translateY = scanPos.interpolate({
        inputRange: [0, 1],
        outputRange: [H * 0.45 - OVAL_H / 2, H * 0.45 + OVAL_H / 2],
    });

    const scanOpacity = quality === "poor" ? 0.25 : 0.9;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Dark mask outside the oval */}
            <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                    <Mask id="faceMask">
                        <Rect width="100%" height="100%" fill="white" />
                        <Ellipse cx="50%" cy="45%" rx={OVAL_W / 2} ry={OVAL_H / 2} fill="black" />
                    </Mask>
                </Defs>
                <Rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#faceMask)" />
            </Svg>

            {/* Pulsing oval border + corner brackets */}
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: pulseScale }] }]}>
                <Svg style={StyleSheet.absoluteFill}>
                    <Ellipse
                        cx="50%"
                        cy="45%"
                        rx={OVAL_W / 2}
                        ry={OVAL_H / 2}
                        fill="none"
                        stroke={borderColor}
                        strokeWidth={2.5}
                    />
                </Svg>

                <View style={[styles.corner, styles.topLeft, { borderColor }]} />
                <View style={[styles.corner, styles.topRight, { borderColor }]} />
                <View style={[styles.corner, styles.bottomLeft, { borderColor }]} />
                <View style={[styles.corner, styles.bottomRight, { borderColor }]} />
            </Animated.View>

            {/* Scanning beam */}
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }], opacity: scanOpacity }]}>
                <Svg height="28" width={W}>
                    <Defs>
                        <LinearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={borderColor} stopOpacity="0" />
                            <Stop offset="0.4" stopColor={borderColor} stopOpacity="0.7" />
                            <Stop offset="1" stopColor={borderColor} stopOpacity="0" />
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width={W} height="1.5" fill={borderColor} opacity="0.9" />
                    <Rect x="0" y="1.5" width={W} height="26.5" fill="url(#beam)" />
                </Svg>
            </Animated.View>

            {/* Capture flash */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.flash, { opacity: flashOpacity }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    corner: {
        position: "absolute",
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        borderWidth: 3,
    },
    topLeft: {
        top: H * 0.45 - OVAL_H / 2 - 8,
        left: W * 0.5 - OVAL_W / 2 - 8,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: H * 0.45 - OVAL_H / 2 - 8,
        right: W * 0.5 - OVAL_W / 2 - 8,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: H - (H * 0.45 + OVAL_H / 2) - 8,
        left: W * 0.5 - OVAL_W / 2 - 8,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: H - (H * 0.45 + OVAL_H / 2) - 8,
        right: W * 0.5 - OVAL_W / 2 - 8,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderBottomRightRadius: 8,
    },
    scanLine: {
        position: "absolute",
        width: W,
        height: 28,
        zIndex: 10,
    },
    flash: {
        backgroundColor: "#fff",
        zIndex: 100,
    },
});

export default FaceGuideOverlay;
