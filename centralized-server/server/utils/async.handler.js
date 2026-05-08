export const asyncHandler =
    (fn, feature = "UNKNOWN") =>
    async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (err) {
            err.feature = err.feature || feature;

            // UPSTREAM EXPRESS ERRORS (Axios)
            if (err.isAxiosError && err.response) {
                const data = err.response.data;

                err.statusCode = err.response.status;

                // Preserve upstream message EXACTLY
                err.message = data?.error || data?.message || err.message;

                // Optional but very useful
                err.code = data?.code || err.code || "UPSTREAM_SERVICE_ERROR";
            }

            next(err);
        }
    };
