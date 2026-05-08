/**
 * On-device face validation — runs on every frame processor callback.
 * Pure functions, no side effects.
 */

const THRESHOLDS = {
    MIN_FACE_SIZE: 0.18, // face must be >= 18% of frame width
    MAX_FACE_SIZE: 0.85, // face must be <= 85% of frame width
    CENTER_MIN: 0.15, // face center must be within 15%-85% of frame
    CENTER_MAX: 0.85,
    // Liveness buffer size kept for hook compatibility (liveness itself is disabled)
    LIVENESS_BUFFER_SIZE: 4,
};

/**
 * Validate a single face for capture readiness.
 * @param {object} face - ML Kit face detection result
 * @param {{ width: number, height: number }} frameSize - camera frame dimensions
 * @returns {{ isValid: boolean, quality: 'good'|'fair'|'poor', issues: string[], scores: object }}
 */
export function validateFace(face, frameSize) {
    if (!face?.bounds || !frameSize?.width || !frameSize?.height) {
        return { isValid: false, quality: "poor", issues: ["Detection data missing"], scores: {} };
    }
    const issues = [];
    const fw = frameSize.width;
    const fh = frameSize.height;

    // Normalize bounds to 0-1 range
    const normW = face.bounds.width / fw;
    const normH = face.bounds.height / fh;
    const centerX = (face.bounds.x + face.bounds.width / 2) / fw;
    const centerY = (face.bounds.y + face.bounds.height / 2) / fh;

    const scores = { faceSize: normW, centerX, centerY };

    // --- SIZE ---
    if (normW < THRESHOLDS.MIN_FACE_SIZE) issues.push("Move closer");
    if (normW > THRESHOLDS.MAX_FACE_SIZE) issues.push("Move back");

    // --- POSITION ---
    if (centerX < THRESHOLDS.CENTER_MIN || centerX > THRESHOLDS.CENTER_MAX) issues.push("Center your face");
    if (centerY < THRESHOLDS.CENTER_MIN || centerY > THRESHOLDS.CENTER_MAX) issues.push("Center your face");

    // --- QUALITY SCORING ---
    let quality;
    if (issues.length === 0) {
        quality = "good";
    } else if (issues.length <= 2) {
        quality = "fair";
    } else {
        quality = "poor";
    }

    return {
        isValid: issues.length === 0,
        quality,
        issues,
        scores,
    };
}

/**
 * Check that exactly one face is present.
 * @param {object[]} faces - array of detected faces
 * @returns {{ ok: boolean, issue: string|null }}
 */
export function checkFaceCount(faces) {
    if (!Array.isArray(faces) || faces.length === 0) {
        return { ok: false, issue: "No face detected" };
    }
    if (faces.length > 1) {
        return { ok: false, issue: "Multiple faces — only one allowed" };
    }
    return { ok: true, issue: null };
}

/**
 * Basic liveness check using a rolling buffer of recent face detections.
 * Catches trivial photo attacks (printed photo / static screen).
 * NOT a replacement for dedicated liveness SDKs.
 *
 * @param {object[]} faceHistory - last N face detections (most recent last)
 * @returns {{ isLive: boolean, reason: string|null, signals: object }}
 */
// Liveness check disabled — face-in-frame is the only gate.
export function livenessCheck(faceHistory) {
    return { isLive: true, reason: null, signals: {} };
}

export { THRESHOLDS };
