import { createController } from "./controller.js";
import { createRoutes } from "./routes.js";
import validateCookie from "#middleware/jwtBearer.js";

/**
 * Setup 2FA service for an Express app.
 * @param {object} app - The Express app instance.
 * @param {object} config - Configuration object.
 * @param {function} config.saveSecret - (userId, secret) => Promise<void>
 * @param {function} config.getSecret - (userId) => Promise<string>
 * @param {string} [config.appName] - Name of the application (for Authenticator app).
 */
export function setup2FA(app, config) {
    if (!config || typeof config.saveSecret !== "function" || typeof config.getSecret !== "function") {
        throw new Error('2FA Service requires "saveSecret" and "getSecret" async functions in config.');
    }

    const controller = createController(config);
    const router = createRoutes(controller);

    // app.use('/2fa', validateCookie,  router);
    app.use("/api/auth/2fa", validateCookie, router);
    return { controller, router };
}
