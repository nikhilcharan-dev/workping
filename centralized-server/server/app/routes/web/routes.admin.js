import authRoutes from "#webRoutes/admin/auth/router.js";
import { verifyPassword } from "#webController/admin/auth/controller.js";
import otpRoutes from "#webRoutes/admin/otp/router.js";
import subscriptionRouter from "#webRoutes/admin/subscriptions/router.js";
import forgotPasswordRouter from "#webRoutes/admin/forgotPassword/router.js";
import mailRouter from "#webRoutes/admin/mail/router.js";
import organizationRouter from "#webRoutes/admin/organization/router.js";
import teamRoutes from "#webRoutes/admin/team/routes.js";
import profileRoutes from "#webRoutes/admin/profile/router.js";
import validateCookie from "#middleware/jwtBearer.js";
import requireRole from "#middleware/requireRole.js";
import authorizeManager from "#middleware/authorizeManager.js";
import { authLimiter } from "../../middleware.js";
import addEmployeesRouter from "#webRoutes/admin/addEmployees/router.js";
import getAllEmployeesRouter from "#webRoutes/admin/getAllEmployees/router.js";
// import teamMemberRoutes from "#webRoutes/admin/teamMembers/routes.js";
import getEmployee from "#webRoutes/admin/employee/router.js";

import projectRoutes from "#webRoutes/admin/project/router.js";
import deleteEmployeesById from "#webController/admin/deleteEmployees/deleteEmployeesByid.js";
import paymentsRouter from "#webRoutes/admin/payments/router.js";
import ordersRouter from "#webRoutes/admin/orders/router.js";
import plansRouter from "#webRoutes/admin/plans/router.js";
import faceEnrollRouter from "#webRoutes/admin/faceEnroll/router.js";
import phonepeGatewayRouter from "#services/phonepe/phonepe.gateway.js";
import holidayRouter from "#webRoutes/admin/holiday/router.js";
import attendanceRouter from "#webRoutes/admin/attendance/router.js";
import leavesRouter from "#webRoutes/admin/leaves/router.js";
import shiftRouter from "#webRoutes/admin/shift/router.js";

const adminOnly = [validateCookie, requireRole("admin")];
const adminOrManager = [validateCookie, requireRole("admin", "manager"), authorizeManager];

export default function adminRoutes(app) {
  app.use("/api/admin/auth", authLimiter, authRoutes);
  app.use("/api/admin/organization", ...adminOnly, organizationRouter);
  app.use("/api/admin/subscriptions", ...adminOnly, subscriptionRouter);
  // OTP
  app.use("/api/admin/otp", authLimiter, otpRoutes);
  app.use("/api/admin/forgot-password", authLimiter, forgotPasswordRouter);
  app.use("/api/admin/mail", ...adminOnly, mailRouter);

  // Forgot Password

  //create-team
  app.use("/api/admin/employee", ...adminOrManager, getEmployee);
  app.use("/api/admin/get-all-employees", ...adminOrManager, getAllEmployeesRouter);
  app.use("/api/admin/employees", ...adminOnly, deleteEmployeesById);
  app.use("/api/admin/team", ...adminOrManager, teamRoutes);
  app.use("/api/admin/add-employees", ...adminOnly, addEmployeesRouter);

  // Project — managers can manage projects and assignments
  app.use("/api/admin/project", ...adminOrManager, projectRoutes);

  // Payments & Orders (read)
  app.use("/api/admin/payments", ...adminOnly, paymentsRouter);
  app.use("/api/admin/orders", ...adminOnly, ordersRouter);

  // Face enrollment
  app.use("/api/admin/employees", ...adminOnly, faceEnrollRouter);

  // Plans
  app.use("/api/admin/plans", ...adminOnly, plansRouter);

  // PhonePe — initiate payment (admin only)
  app.use("/api/admin/phonepe", ...adminOnly, phonepeGatewayRouter);

  // Admin Profile
  app.use("/api/admin/profile", ...adminOrManager, profileRoutes);

  // Holiday
  app.use("/api/admin/holiday", ...adminOrManager, holidayRouter);

  // Attendance — managers can view team attendance
  app.use("/api/admin/attendance", ...adminOrManager, attendanceRouter);

  // Leaves — managers can view and action team leaves
  app.use("/api/admin/leaves", ...adminOrManager, leavesRouter);

  // Shifts
  app.use("/api/admin/shifts", ...adminOrManager, shiftRouter);

  // Lock screen password verification (requires valid session cookie)
  app.post("/api/admin/auth/verify-password", ...adminOnly, verifyPassword);
}
