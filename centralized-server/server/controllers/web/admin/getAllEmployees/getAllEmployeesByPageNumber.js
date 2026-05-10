import User from "#models/User.js";
import mongoose from "mongoose";
import Pagination from "#helpers/pagination.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId, validateString } from "#utils/validators.js";
import OrgAdmin from "#models/Admin.Org.js";
import Team from "#models/Team.js";

export const getAllEmployeesByPageNumber = asyncHandler(async (req, res) => {
  let { search = "", organizationId, teamId, page = 1, limit } = req.query;

  // Validate search string length
  if (search !== "") {
    const searchValidation = validateString(search, "Search", {
      maxLength: 100,
    });
    if (!searchValidation.valid) {
      return errorResponse(res, searchValidation.error);
    }
  }

  // Validate organization ID if provided
  if (organizationId) {
    const orgIdValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgIdValidation.valid) {
      return errorResponse(res, orgIdValidation.error);
    }
  }

  // Validate team ID if provided
  if (teamId) {
    const teamIdValidation = validateObjectId(teamId, "Team ID");
    if (!teamIdValidation.valid) {
      return errorResponse(res, teamIdValidation.error);
    }
  }

  search = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let filter = [];

  if (search) {
    filter.push({
      $match: {
        $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
      },
    });
  }

  if (organizationId) {
    filter.push({
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
    });
  } else {
    const orgAdmins = await OrgAdmin.find(
      { primaryAdmin: new mongoose.Types.ObjectId(req.user.userId) },
      { organizationId: 1 }
    );

    const organizationIds = orgAdmins.map((org) => org.organizationId);

    filter.push({
      $match: {
        organizationId: { $in: organizationIds },
      },
    });
  }

  if (teamId) {
    if (teamId != "none") {
      filter.push({
        $match: {
          teamId: new mongoose.Types.ObjectId(teamId),
        },
      });
    } else {
      filter.push({
        $match: {
          teamId: null,
        },
      });
    }
  }

  // Lookup organization name
  filter.push({
    $lookup: {
      from: "organizations",
      localField: "organizationId",
      foreignField: "_id",
      as: "organization",
    },
  });
  filter.push({
    $unwind: { path: "$organization", preserveNullAndEmptyArrays: true },
  });

  // Lookup team/department name
  filter.push({
    $lookup: {
      from: "teams",
      localField: "teamId",
      foreignField: "_id",
      as: "team",
    },
  });
  filter.push({
    $unwind: { path: "$team", preserveNullAndEmptyArrays: true },
  });

  // Lookup govt proof (PAN, Aadhaar, passport, bank)
  filter.push({
    $lookup: {
      from: "govtproofs",
      localField: "_id",
      foreignField: "userId",
      as: "govtProof",
    },
  });
  filter.push({
    $unwind: { path: "$govtProof", preserveNullAndEmptyArrays: true },
  });

  // Lookup projects the employee belongs to
  filter.push({
    $lookup: {
      from: "projectmembers",
      localField: "_id",
      foreignField: "userId",
      as: "projectMemberships",
    },
  });
  filter.push({
    $lookup: {
      from: "projects",
      localField: "projectMemberships.projectId",
      foreignField: "_id",
      as: "assignedProjects",
    },
  });

  // Project fields: replace organizationId with organizationName, add department & govt proof fields
  filter.push({
    $addFields: {
      organizationName: { $ifNull: ["$organization.name", null] },
      departmentName: { $ifNull: ["$team.teamName", null] },
      projects: { $ifNull: ["$assignedProjects.name", []] },
      aadhaarNumber: { $ifNull: ["$govtProof.aadhaarNumber", null] },
      panNumber: { $ifNull: ["$govtProof.panNumber", null] },
      passportNumber: { $ifNull: ["$govtProof.passportNumber", null] },
      bankAccount: { $ifNull: ["$govtProof.bankAccount", null] },
      dateOfJoining: { $dateToString: { format: "%Y-%m-%d", date: "$dateOfJoining" } },
      dob: { $cond: { if: "$dob", then: { $dateToString: { format: "%Y-%m-%d", date: "$dob" } }, else: null } },
      workType: { $ifNull: ["$workType", null] },
      profileImage: { $ifNull: ["$profileImage", null] },
      // Frontend-expected field aliases
      userName: "$name",
      userId: "$employeeId",
      doj: { $dateToString: { format: "%Y-%m-%d", date: "$dateOfJoining" } },
      aadhaar: { $ifNull: ["$govtProof.aadhaarNumber", null] },
      pan: { $ifNull: ["$govtProof.panNumber", null] },
      passport: { $ifNull: ["$govtProof.passportNumber", null] },
      bankId: { $ifNull: ["$govtProof.bankAccount", null] },
    },
  });
  filter.push({
    $project: {
      organization: 0,
      team: 0,
      govtProof: 0,
    },
  });

  const pagination = await Pagination(User, page, limit, filter);

  return successResponse(res, "Employees fetched", {
    totalPages: pagination.totalPages,
    totalRecords: pagination.totalRecords,
    data: pagination.documents,
  });
}, "GET_ALL_EMPLOYEES_BY_PAGE_NUMBER_CONTROLLER");

export const getManagerEmployees = asyncHandler(async (req, res) => {
  let { search = "", page = 1, limit = 10 } = req.query;
  const { userId: managerId, organizationId } = req.user;

  // 1. Find all teams managed by this user
  const managedTeams = await Team.find({ managerId, organizationId }).select("_id");
  const teamIds = managedTeams.map((t) => t._id);

  if (!teamIds.length) {
    return successResponse(res, "No teams managed", { totalPages: 0, totalRecords: 0, data: [] });
  }

  if (search !== "") {
    const searchValidation = validateString(search, "Search", { maxLength: 100 });
    if (!searchValidation.valid) return errorResponse(res, searchValidation.error);
  }

  search = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let filter = [
    {
      $match: {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        teamId: { $in: teamIds.map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
  ];

  if (search) {
    filter.push({
      $match: {
        $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
      },
    });
  }

  // Reuse the same lookups and transformations as the main admin endpoint
  filter.push(
    { $lookup: { from: "organizations", localField: "organizationId", foreignField: "_id", as: "organization" } },
    { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "teams", localField: "teamId", foreignField: "_id", as: "team" } },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "govtproofs", localField: "_id", foreignField: "userId", as: "govtProof" } },
    { $unwind: { path: "$govtProof", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "projectmembers", localField: "_id", foreignField: "userId", as: "projectMemberships" } },
    {
      $lookup: {
        from: "projects",
        localField: "projectMemberships.projectId",
        foreignField: "_id",
        as: "assignedProjects",
      },
    },
    {
      $addFields: {
        organizationName: { $ifNull: ["$organization.name", null] },
        departmentName: { $ifNull: ["$team.teamName", null] },
        projects: { $ifNull: ["$assignedProjects.name", []] },
        aadhaarNumber: { $ifNull: ["$govtProof.aadhaarNumber", null] },
        panNumber: { $ifNull: ["$govtProof.panNumber", null] },
        passportNumber: { $ifNull: ["$govtProof.passportNumber", null] },
        bankAccount: { $ifNull: ["$govtProof.bankAccount", null] },
        dateOfJoining: { $dateToString: { format: "%Y-%m-%d", date: "$dateOfJoining" } },
        dob: {
          $cond: { if: "$dob", then: { $dateToString: { format: "%Y-%m-%d", date: "$dob" } }, else: null },
        },
        workType: { $ifNull: ["$workType", null] },
        profileImage: { $ifNull: ["$profileImage", null] },
        userName: "$name",
        userId: "$employeeId",
        doj: { $dateToString: { format: "%Y-%m-%d", date: "$dateOfJoining" } },
        bankId: { $ifNull: ["$govtProof.bankAccount", null] },
      },
    },
    { $project: { organization: 0, team: 0, govtProof: 0, assignedProjects: 0, projectMemberships: 0 } }
  );

  const pagination = await Pagination(User, page, limit, filter);

  return successResponse(res, "Manager-scoped employees fetched", {
    totalPages: pagination.totalPages,
    totalRecords: pagination.totalRecords,
    data: pagination.documents,
  });
}, "GET_MANAGER_EMPLOYEES_CONTROLLER");

export default getAllEmployeesByPageNumber;
