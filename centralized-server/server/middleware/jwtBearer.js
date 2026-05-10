import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "#utils/token.helper.js";

const validateCookie = async (req, res, next) => {
    try {
        let token = null;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({ type: "error", message: "Unauthorized", code: "NO_TOKEN" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ type: "error", message: "Token expired", code: "TOKEN_EXPIRED" });
            }
            return res.status(401).json({ type: "error", message: "Unauthorized", code: "INVALID_TOKEN" });
        }

        // Reject tokens that have been explicitly revoked (logout, password change, role change)
        if (await isTokenBlacklisted(token)) {
            return res.status(401).json({ type: "error", message: "Token has been revoked", code: "TOKEN_REVOKED" });
        }

        req.user = decoded;
        req.accessToken = token; // available to controllers that need to blacklist it
        next();
    } catch (err) {
        res.status(500).json({ type: "error", message: "Internal Server Error" });
    }
};

export default validateCookie;
