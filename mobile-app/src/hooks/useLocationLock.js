/**
 * useLocationLock — manages location permissions and snapshot collection.
 *
 * On mount: checks foreground location permission, warms GPS if granted.
 * Exposes collectSnapshot() for the capture pipeline.
 * Never blocks — always returns best-effort data.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import * as Location from "expo-location";
import { collectLocationSnapshot } from "@/utils/locationLock";

const PERMISSION = {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
};

export default function useLocationLock() {
    const [permissionStatus, setPermissionStatus] = useState(PERMISSION.UNDETERMINED);
    const [lastSnapshot, setLastSnapshot] = useState(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // --- CHECK PERMISSION ON MOUNT ---
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (!isMountedRef.current) return;
                setPermissionStatus(status);

                // Warm GPS if already granted (first fix takes ~2s, subsequent ~50ms)
                if (status === PERMISSION.GRANTED) {
                    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => {});
                }
            } catch {
                // Location services may be disabled entirely
            }
        })();
    }, []);

    // --- REQUEST PERMISSIONS ---
    const requestPermissions = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (!isMountedRef.current) return status;
            setPermissionStatus(status);

            // Warm GPS on fresh grant
            if (status === PERMISSION.GRANTED) {
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => {});
            }
            return status;
        } catch {
            return PERMISSION.DENIED;
        }
    }, []);

    // Keep a ref in sync so collectSnapshot can read latest value without re-creating
    const permissionRef = useRef(permissionStatus);
    useEffect(() => {
        permissionRef.current = permissionStatus;
    }, [permissionStatus]);

    // --- COLLECT SNAPSHOT ---
    const collectSnapshot = useCallback(async () => {
        if (permissionRef.current !== PERMISSION.GRANTED) {
            return null;
        }

        try {
            const snapshot = await collectLocationSnapshot();
            if (isMountedRef.current) {
                setLastSnapshot(snapshot);
            }
            return snapshot;
        } catch {
            return null;
        }
    }, []);

    return {
        permissionStatus,
        isGranted: permissionStatus === PERMISSION.GRANTED,
        isDenied: permissionStatus === PERMISSION.DENIED,
        requestPermissions,
        collectSnapshot,
        lastSnapshot,
    };
}
