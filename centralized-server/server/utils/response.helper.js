/**
 * Standard response helpers.
 * All endpoints must use these instead of raw res.json().
 *
 * Success shape: { type: "success", message, [data] }
 * Error shape:   { type: "error",   message }
 */

export const successResponse = (res, message, data = null, statusCode = 200) => {
    const payload = { type: "success", message };
    if (data !== null) payload.data = data;
    return res.status(statusCode).json(payload);
};

export const errorResponse = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({ type: "error", message });
};
