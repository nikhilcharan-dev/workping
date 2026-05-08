/**
 * Role-based access middleware.
 * Must be placed after validateCookie (which sets req.user).
 *
 * Usage:
 *   router.use(validateCookie, requireRole("admin"))
 *   router.patch("/approve", requireRole("manager"), approveLeave)
 */
const requireRole =
    (...roles) =>
    (req, res, next) => {
        if (!req.user?.role || !roles.includes(req.user.role)) {
            return res.status(403).json({ type: "error", message: "Forbidden" });
        }
        next();
    };

export default requireRole;
