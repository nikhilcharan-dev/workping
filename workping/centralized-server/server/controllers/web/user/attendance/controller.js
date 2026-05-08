import Attendance from "#models/Attendance.js";
import User from "#models/User.js";
import ProjectMember from "#models/ProjectMember.js";
import Project from "#models/Project.js";
import Shift from "#models/Shift.js";
import { validateArray } from "#utils/validators.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validate3DLocation } from "#utils/location.js";
import { submitRecognitionTask, checkRecognitionStatus } from "#services/face_recognition/model.js";
import { sendWhatsApp } from "#services/whatsapp/whatsapp.service.js";
import { trace } from "#utils/traceLogger.js";

/**
 * Perform 3D Location Validation before marking attendance
 * POST /api/user/attendance/verify-location
 */
export const verify_location = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const locationLock = req.body;

    const user = await User.findById(userId).populate("organizationId");
    if (!user || !user.organizationId) {
        return errorResponse(res, "User or Organization not found", 404);
    }

    const validation = validate3DLocation(locationLock, user.organizationId);

    return successResponse(res, validation.message, {
        allowed: validation.allowed,
    });
});

/**
 * Shared: validate a face recognition result and record attendance.
 * Called from both direct-result mode and ticket-poll mode.
 *
 * faceRes shape (direct):  { success, confidence, person: { id }, error? }
 * faceRes shape (ticket):  same, nested under ticket.result
 *
 * NOTE: face embeddings are stored by MongoDB _id (userId), not by employeeId string.
 */
async function recordAttendance(faceRes, user, userId, res) {
    if (!faceRes.success || (faceRes.confidence ?? 0) < 0.6) {
        const errMsg = faceRes.error || "Face not recognised. Please try again in better lighting";
        trace("FAILURE", `Face not recognised: ${errMsg} (confidence=${faceRes.confidence})`);
        return errorResponse(res, errMsg, 403);
    }

    // Embeddings are keyed by MongoDB userId, not by human-readable employeeId
    if (faceRes.person?.id !== userId) {
        trace("FAILURE", `Identity mismatch. Expected userId: ${userId}, Got: ${faceRes.person?.id}`);
        return errorResponse(res, "Identity mismatch. Your face does not match this account", 403);
    }
    trace("CHECK", "Identity verified");

    const confidence = faceRes.confidence;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    let attendance = await Attendance.findOne({
        userId,
        date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!attendance) {
        // Resolve active project + shift-based status determination
        let projectId = null;
        let status = "present";

        const activeMembership = await ProjectMember.findOne({ userId, isActive: true })
            .sort({ assignedDate: -1 })
            .lean();

        if (activeMembership) {
            projectId = activeMembership.projectId;
            const project = await Project.findById(projectId).select("shiftId").lean();
            if (project?.shiftId) {
                const shift = await Shift.findById(project.shiftId).select("startTime slotEnd").lean();
                if (shift) {
                    const slotEndStr = shift.slotEnd || shift.startTime;
                    const [h, m] = slotEndStr.split(":").map(Number);
                    const now = new Date();
                    if (now.getHours() * 60 + now.getMinutes() > h * 60 + m) status = "late";
                }
            }
        }

        attendance = await Attendance.create({
            userId,
            organizationId: user.organizationId,
            projectId,
            date: new Date(),
            status,
            checkIn: new Date(),
            remarks: `Verified with confidence ${confidence.toFixed(2)}`,
        });
        trace("SUCCESS", `Check-In created for user: ${userId} (status=${status}, project=${projectId})`);
    } else if (!attendance.checkOut) {
        attendance.checkOut = new Date();
        await attendance.save();
        trace("SUCCESS", `Check-Out recorded for user: ${userId}`);
    } else {
        trace("CHECK", `Attendance already completed today for user: ${userId}`);
    }

    // WhatsApp notification — fire-and-forget
    const action = attendance.checkOut ? "Check-Out" : "Check-In";
    const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    sendWhatsApp(
        user.phone,
        `*WorkPing Attendance* ✅\nHi ${user.name}, your *${action}* at *${timeStr}* has been marked successfully.\n_Employee ID: ${user.employeeId}_`
    ).catch((err) => {
        trace("FAILURE", `WhatsApp notification failed: ${err.message}`);
        console.error("[WhatsApp] Attendance notification failed:", err.message);
    });

    const finalResponse = {
        confidence,
        status: "completed",
        name: user?.name || "User",
        employeeId: user?.employeeId,
        workType: user?.workType,
        profileImage: user?.profileImage,
        attendance,
    };
    trace("DATA", `Attendance marked. Response: ${JSON.stringify(finalResponse)}`);
    return successResponse(res, "Attendance marked", finalResponse);
}

export const verify_mark_attendance = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const frames = req.files;
    const locationLockRaw = req.query.locationLock || req.body.locationLock;

    trace("REQUEST", `verify_mark_attendance started for user: ${userId}`);

    // 1. Frame validation
    const framesValidation = validateArray(frames, "Frames", { required: true, minLength: 1 });
    if (!framesValidation.valid) {
        trace("FAILURE", `Frames validation failed: ${framesValidation.error}`);
        return errorResponse(res, framesValidation.error);
    }
    trace("CHECK", "Frames validation passed");

    // 2. User + 3D location check
    const user = await User.findById(userId).populate("organizationId");
    if (!user) {
        trace("FAILURE", `User not found: ${userId}`);
        return errorResponse(res, "User not found", 404);
    }
    trace("CHECK", `User identified: ${user.name} (${user.employeeId})`);

    if (locationLockRaw) {
        try {
            const locationLock = typeof locationLockRaw === "string" ? JSON.parse(locationLockRaw) : locationLockRaw;

            if (user.organizationId) {
                // Extract real client IP server-side as a fallback for when the
                // mobile client doesn't provide publicIp in the locationLock payload.
                const serverIp =
                    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
                    req.headers["x-real-ip"] ||
                    req.ip ||
                    null;

                const validation = validate3DLocation(locationLock, user.organizationId, serverIp);
                if (!validation.allowed) {
                    trace("FAILURE", `Location security block: ${validation.message}`);
                    return errorResponse(res, `Security Block: ${validation.message}`, 403);
                }
                trace("CHECK", "Location validation passed");
            }
        } catch (err) {
            trace("FAILURE", `Location Lock parse error: ${err.message}`);
            console.error("[Attendance] Location Lock parse error:", err.message);
        }
    } else {
        trace("CHECK", "No locationLock provided, skipping security check");
    }

    const validMimeTypes = ["image/jpeg", "image/jpg", "image/png"];
    for (let i = 0; i < frames.length; i++) {
        if (!validMimeTypes.includes(frames[i].mimetype)) {
            trace("FAILURE", `Frame ${i + 1} invalid type: ${frames[i].mimetype}`);
            return errorResponse(res, `Frame ${i + 1} has invalid file type. Only JPEG and PNG are allowed`);
        }
        if (frames[i].size > 5 * 1024 * 1024) {
            trace("FAILURE", `Frame ${i + 1} exceeds 5MB: ${frames[i].size}`);
            return errorResponse(res, `Frame ${i + 1} exceeds maximum size of 5MB`);
        }
    }
    trace("CHECK", "Frame validation passed");

    // 3. Submit to face recognition service
    // Use MongoDB userId as the face API key — embeddings are stored by _id, not employeeId string
    const taskRes = await submitRecognitionTask(frames[0].buffer, userId, user.organizationId._id);
    console.log("[FaceRecognition] raw response:", JSON.stringify(taskRes).slice(0, 500));

    // Unwrap potential envelope ({ data: {...} })
    const taskData = taskRes?.data ?? taskRes;

    // ── Mode A: Queued (ticket-based) ───────────────────────────────────────────
    // Python service queued the job and returned a ticket_id for polling.
    const ticketId = taskData.ticket_id || taskData.ticketId || taskData.id;
    if (ticketId) {
        trace("SUCCESS", `Face detection queued. Ticket: ${ticketId}`);
        return successResponse(res, "Face detection queued", {
            ticketId,
            status: taskData.status || "queued",
            position: taskData.position ?? taskData.queue_position ?? 0,
        });
    }

    // ── Mode B: Direct result (synchronous service) ─────────────────────────────
    // Python service processed the image inline and returned the result directly.
    trace("CHECK", `Direct result received — success=${taskData.success}, confidence=${taskData.confidence}`);
    return recordAttendance(taskData, user, userId, res);
}, "USER_VERIFY_MARK_ATTENDANCE_ERROR");

export const verify_mark_attendance_status = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { ticketId } = req.params;

    trace("REQUEST", `verify_mark_attendance_status for ticket: ${ticketId}`);

    const user = await User.findById(userId).populate("organizationId");
    if (!user) {
        trace("FAILURE", `User not found: ${userId}`);
        return errorResponse(res, "User not found", 404);
    }

    const ticketData = await checkRecognitionStatus(ticketId);
    trace("CHECK", `Ticket status: ${ticketData.status}`);

    if (ticketData.status !== "completed") {
        return successResponse(res, "Processing", { status: ticketData.status, ticketId });
    }

    return recordAttendance(ticketData.result, user, userId, res);
}, "USER_VERIFY_MARK_ATTENDANCE_STATUS_ERROR");
