// middleware/errorHandler.js
export default function errorHandler(err, req, res, next) {
    const ctx = req.context || {};

    const status = err.statusCode || 500;
    var message = err.isOperational ? err.message : "Internal Server Error";

    if (err instanceof SyntaxError && err.message.includes("JSON")) {
        err.statusCode = 400;
        message = err.message = "Invalid JSON payload";
    }

    console.error({
        level: "error",
        feature: err.feature || "UNKNOWN",
        code: err.statusCode,
        status,
        message: err.message,
        method: req.method,
        path: req.path,
        stack: err.stack,
    });

    res.status(status).json({
        type: "error",
        message,
    });
}
