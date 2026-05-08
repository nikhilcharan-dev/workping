import Salary from "#models/Salary.js";
import User from "#models/User.js";
import mongoose from "mongoose";
import Pagination from "#helpers/pagination.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId, validateMonth, validateEnum } from "#utils/validators.js";

export const getMySalarySlips = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    let { page = 1, limit = 10, status } = req.query;

    if (status) {
        const statusValidation = validateEnum(status, ["pending", "paid"], "Status");
        if (!statusValidation.valid) return errorResponse(res, statusValidation.error);
    }

    const filter = [{ $match: { userId: new mongoose.Types.ObjectId(userId) } }];
    if (status) filter.push({ $match: { status } });

    filter.push({
        $lookup: {
            from: "organizations",
            localField: "organizationId",
            foreignField: "_id",
            as: "organization",
        },
    });
    filter.push({ $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } });
    filter.push({
        $addFields: {
            organizationName: "$organization.name",
        },
    });
    filter.push({ $project: { organization: 0 } });
    filter.push({ $sort: { generatedDate: -1 } });

    const pagination = await Pagination(Salary, page, limit, filter);

    return successResponse(res, "Salary slips fetched", {
        totalRecords: pagination.totalRecords,
        totalPages: pagination.totalPages,
        salarySlips: pagination.documents,
    });
}, "USER_GET_SALARY_SLIPS_ERROR");

export const getSalarySlipById = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { salaryId } = req.params;

    const idValidation = validateObjectId(salaryId, "Salary ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    const [salary] = await Salary.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(salaryId), userId: new mongoose.Types.ObjectId(userId) } },
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
            $addFields: {
                organizationName: "$organization.name",
            },
        },
        { $project: { organization: 0 } },
    ]);

    if (!salary) return errorResponse(res, "Salary slip not found", 404);

    return successResponse(res, "Salary slip fetched", salary);
}, "USER_GET_SALARY_SLIP_BY_ID_ERROR");

export const getSalaryByMonth = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { month } = req.query;

    const monthValidation = validateMonth(month);
    if (!monthValidation.valid) return errorResponse(res, monthValidation.error);

    const [salary] = await Salary.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), month } },
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
            $addFields: {
                organizationName: "$organization.name",
            },
        },
        { $project: { organization: 0 } },
    ]);

    if (!salary) return errorResponse(res, "Salary slip not found for the given month", 404);

    return successResponse(res, "Salary slip fetched", salary);
}, "USER_GET_SALARY_BY_MONTH_ERROR");
