/**
 * Recursively strip MongoDB operator keys ($where, $gt, $regex, etc.) and
 * dot-notation keys from any object. Protects against NoSQL injection via
 * request body, query string, and params.
 */
function sanitize(value) {
    if (Array.isArray(value)) {
        return value.map(sanitize);
    }
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([k]) => !k.startsWith("$") && !k.includes("."))
                .map(([k, v]) => [k, sanitize(v)])
        );
    }
    return value;
}

export default function sanitizeMongo(req, _res, next) {
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
    next();
}
