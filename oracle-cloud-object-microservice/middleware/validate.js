const SAFE_NAME_RE = /^[a-zA-Z0-9._\-]+$/;
const MAX_NAME_LEN = 256;

function isSafeName(name) {
    return (
        typeof name === "string" &&
        name.length > 0 &&
        name.length <= MAX_NAME_LEN &&
        SAFE_NAME_RE.test(name) &&
        !name.includes("..")
    );
}

export function validateBucketName(req, res, next) {
    const { bucketName } = req.params;
    if (!isSafeName(bucketName)) {
        return res.status(400).json({ error: "Invalid bucket name" });
    }
    next();
}

export function validateObjectName(req, res, next) {
    const { objectName } = req.params;
    if (!isSafeName(objectName)) {
        return res.status(400).json({ error: "Invalid object name" });
    }
    next();
}

export function validateObjectNameBody(req, res, next) {
    const { objectName } = req.body;
    if (!objectName) {
        return res.status(400).json({ error: "objectName required" });
    }
    if (!isSafeName(objectName)) {
        return res.status(400).json({ error: "Invalid object name" });
    }
    next();
}
