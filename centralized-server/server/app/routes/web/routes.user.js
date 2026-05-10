import authRoutes from "#webRoutes/user/auth/router.js";
import userRoutes from "#webRoutes/user/users/router.js";
import leaveRoutes from "#webRoutes/user/leaves/router.js";
import organisationRoutes from "#webRoutes/user/organisation/router.js";
import payrollRoutes from "#webRoutes/user/payroll/router.js";
import projectRoutes from "#webRoutes/user/projects/router.js";
import attendanceHistoryRoutes from "#webRoutes/user/attendance/history.router.js";
import attendanceRouter from "#webRoutes/user/attendance/router.js";
import faceRouter from "#webRoutes/user/face/router.js";
import holidayRoutes from "#webRoutes/user/holiday/router.js";
import dashboardRoutes from "#webRoutes/user/dashboard/router.js";

import validateCookie from "#middleware/jwtBearer.js";
import requireRole from "#middleware/requireRole.js";

const userOnly = [validateCookie, requireRole("user", "manager", "teamlead", "employee")];

export default function userRoutesSetup(app) {
  app.use("/api/auth", authRoutes);
  app.use("/api/user", ...userOnly, userRoutes);
  app.use("/api/user/leaves", ...userOnly, leaveRoutes);
  app.use("/api/user/organisation", ...userOnly, organisationRoutes);
  app.use("/api/user/payroll", ...userOnly, payrollRoutes);
  app.use("/api/user/projects", ...userOnly, projectRoutes);
  app.use("/api/user/attendance", ...userOnly, attendanceHistoryRoutes);
  app.use("/api/user/attendance", ...userOnly, attendanceRouter);
  app.use("/api/user/face", ...userOnly, faceRouter);
  app.use("/api/user/holiday", ...userOnly, holidayRoutes);
  app.use("/api/user/dashboard", ...userOnly, dashboardRoutes);
}
