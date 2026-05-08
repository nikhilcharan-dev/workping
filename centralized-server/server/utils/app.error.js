export class AppError extends Error {
    constructor(message, statusCode = 500, code, options = {}) {
        super(message);

        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        // Optional metadata (very useful in microservices)
        this.feature = options.feature;
        this.upstream = options.upstream;
        this.cause = options.cause;

        Error.captureStackTrace(this, this.constructor);
    }
}
