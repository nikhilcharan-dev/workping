import jwt from "jsonwebtoken";

const validateCookie = (req, res, next) => {
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

        jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
            if (err) {
                // Distinguish expired tokens from invalid ones so clients can attempt a refresh
                if (err.name === "TokenExpiredError") {
                    return res.status(401).json({ type: "error", message: "Token expired", code: "TOKEN_EXPIRED" });
                }
                return res.status(401).json({ type: "error", message: "Unauthorized", code: "INVALID_TOKEN" });
            }
            req.user = decoded;
            next();
        });
    } catch (err) {
        res.status(500).json({ type: "error", message: "Internal Server Error" });
    }
};

export default validateCookie;
