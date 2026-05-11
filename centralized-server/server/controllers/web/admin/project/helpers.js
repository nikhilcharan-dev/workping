import mongoose from "mongoose";
import Project from "#models/Project.js";
import Shift from "#models/Shift.js";
import User from "#models/User.js";
import OrgAdmin from "#models/Admin.Org.js";
import { validateObjectId, validateString, validatePagination, validateDate } from "#utils/validators.js";
import { scheduleShiftReminders } from "#services/shiftReminder/shiftReminder.cron.js";

/**
 * Validate date fields (assignedDate, dueDate)
 */
export function validateProjectDate(dateValue, fieldName, options = {}) {
  return validateDate(dateValue, fieldName, options);
}

/**
 * Check if project name already exists in organization
 */
export async function checkProjectNameExists(name, organizationId, excludeId = null) {
  const query = { name, organizationId };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Project.findOne(query);
  return { exists: !!existing };
}

/**
 * Build shift data for create/update
 */
export function buildShiftData(shiftInput, projectName) {
  if (!shiftInput?.startTime || !shiftInput?.endTime) {
    return null;
  }

  return {
    name: `${projectName} Shift`,
    startTime: shiftInput.startTime,
    endTime: shiftInput.endTime,
    slotEnd: shiftInput.slotEnd || undefined,
    slotStart: shiftInput.slotStart || undefined,
    breakMinutes: shiftInput.breakMinutes ? Number(shiftInput.breakMinutes) : 60,
  };
}

/**
 * Create or update shift for a project
 */
export async function createOrUpdateShift(shiftData, organizationId, existingShiftId = null, projectId = null) {
  if (!shiftData) return null;

  if (existingShiftId) {
    await Shift.findByIdAndUpdate(existingShiftId, shiftData);
    return existingShiftId;
  }

  const shift = await Shift.create({
    ...shiftData,
    organizationId,
  });
  return shift._id;
}

/**
 * Schedule shift reminders for a project (fire-and-forget)
 */
export function scheduleReminders(projectId) {
  scheduleShiftReminders(undefined, String(projectId)).catch((err) =>
    console.error("[ShiftReminder] Schedule failed:", err.message)
  );
}

/**
 * Get manager's organization ID from user record
 */
export async function getManagerOrganizationId(managerId) {
  const userRec = await User.findById(managerId).select("organizationId").lean();
  return userRec?.organizationId;
}

/**
 * Get paginated projects for admin
 */
export function buildAdminProjectsAggregation(search, organizationIds) {
  const filter = [];

  if (search) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.push({ $match: { name: { $regex: escapedSearch, $options: "i" } } });
  }

  if (organizationIds && organizationIds.length > 0) {
    filter.push({
      $match: { organizationId: { $in: organizationIds } },
    });
  }

  filter.push(
    {
      $lookup: {
        from: "organizations",
        localField: "organizationId",
        foreignField: "_id",
        as: "organization",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "projectManager",
        foreignField: "_id",
        as: "manager",
      },
    },
    {
      $lookup: {
        from: "projectmembers",
        localField: "_id",
        foreignField: "projectId",
        as: "members",
      },
    },
    {
      $addFields: {
        organizationName: { $arrayElemAt: ["$organization.name", 0] },
        projectManagerName: { $arrayElemAt: ["$manager.name", 0] },
        memberCount: { $size: "$members" },
        assignedDate: { $dateToString: { format: "%Y-%m-%d", date: "$assignedDate" } },
        dueDate: {
          $cond: {
            if: "$dueDate",
            then: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
            else: null,
          },
        },
      },
    },
    { $project: { members: 0, manager: 0, organization: 0 } }
  );

  return filter;
}

/**
 * Get paginated projects for manager
 */
export function buildManagerProjectsAggregation(managerId, organizationId, search) {
  const managerObjectId = new mongoose.Types.ObjectId(managerId);
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);

  const filter = [
    {
      $lookup: {
        from: "projectteams",
        localField: "_id",
        foreignField: "projectId",
        as: "associatedTeams",
      },
    },
    {
      $match: {
        organizationId: orgObjectId,
        $or: [
          { projectManager: managerObjectId },
          { "associatedTeams.teamManagerId": managerObjectId },
        ],
      },
    },
  ];

  if (search) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.push({ $match: { name: { $regex: escapedSearch, $options: "i" } } });
  }

  filter.push(
    {
      $lookup: {
        from: "organizations",
        localField: "organizationId",
        foreignField: "_id",
        as: "organization",
      },
    },
    {
      $lookup: {
        from: "projectmembers",
        localField: "_id",
        foreignField: "projectId",
        as: "members",
      },
    },
    {
      $addFields: {
        organizationName: { $arrayElemAt: ["$organization.name", 0] },
        memberCount: { $size: "$members" },
        assignedDate: { $dateToString: { format: "%Y-%m-%d", date: "$assignedDate" } },
        dueDate: {
          $cond: {
            if: "$dueDate",
            then: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
            else: null,
          },
        },
      },
    },
    { $project: { members: 0, organization: 0 } }
  );

  return filter;
}

/**
 * Get project with full details
 */
export async function getProjectWithDetails(projectId) {
  const [project] = await Project.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(projectId) } },
    {
      $lookup: {
        from: "users",
        localField: "projectManager",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, employeeId: 1, email: 1, workType: 1, profileImage: 1 } }],
        as: "projectManagerInfo",
      },
    },
    { $unwind: { path: "$projectManagerInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "organizations",
        localField: "organizationId",
        foreignField: "_id",
        as: "organization",
      },
    },
    { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "shifts",
        localField: "shiftId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, startTime: 1, endTime: 1, slotStart: 1, slotEnd: 1, breakMinutes: 1 } }],
        as: "shiftData",
      },
    },
    { $unwind: { path: "$shiftData", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        projectManagerName: { $ifNull: ["$projectManagerInfo.name", null] },
        organizationName: { $ifNull: ["$organization.name", null] },
        assignedDate: { $dateToString: { format: "%Y-%m-%d", date: "$assignedDate" } },
        dueDate: {
          $cond: {
            if: "$dueDate",
            then: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
            else: null,
          },
        },
      },
    },
    { $project: { projectManagerInfo: 0, organization: 0 } },
  ]);

  return project;
}

/**
 * Validate delete request IDs
 */
export async function validateDeleteIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { valid: false, error: "ids must be a non-empty array" };
  }

  for (const id of ids) {
    const idValidation = validateObjectId(id, "Project ID");
    if (!idValidation.valid) {
      return { valid: false, error: idValidation.error };
    }
  }

  return { valid: true, objectIds: ids.map((id) => new mongoose.Types.ObjectId(id)) };
}

/**
 * Get admin organization IDs for user
 */
export async function getAdminOrganizations(userId) {
  const orgAdmins = await OrgAdmin.find({ primaryAdmin: userId }, { organizationId: 1 });
  return orgAdmins.map((org) => org.organizationId);
}
