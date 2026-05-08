import express from "express";
import "dotenv/config";

import middlewares from "./middleware.js";

import twoFactorRoutes from "./2fa.js";
import centralWebRoutes from "./routes/web/routes.central.js";
import adminWebRoutes from "./routes/web/routes.admin.js";
import userWebRoutes from "./routes/web/routes.user.js";
import internalRouter from "../routes/internal/router.js";

import errorHandler from "../middleware/errorHandler.js";

const app = express();

// Liveness probe — used by load balancers, Docker health checks, and k8s probes.
// Intentionally placed BEFORE middlewares so it bypasses rate-limiting and auth.
app.get("/health", (req, res) => {
    res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
    res.status(200).json({
        status: "Running",
        contributors: [
            {
                name: "Nikhil Charan",
                role: "Developer",
                github: "https://github.com/nikhilcharan-dev",
            },
            {
                name: "Lova Reddy",
                role: "Developer",
                github: "https://github.com/Lova-Reddy",
            },
            {
                name: "Umar",
                role: "Developer",
                github: "https://github.com/shaikumar0",
            },
        ],
    });
});

middlewares(app);

twoFactorRoutes(app);
centralWebRoutes(app);
adminWebRoutes(app);
userWebRoutes(app);
app.use("/internal", internalRouter);

app.use(errorHandler);

export default app;
