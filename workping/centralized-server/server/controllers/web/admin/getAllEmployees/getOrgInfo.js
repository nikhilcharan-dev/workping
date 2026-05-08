import AdminOrg from "#models/Admin.Org.js";
import Team from "#models/Team.js";
import mongoose from "mongoose";
import { successResponse } from "#utils/response.helper.js";

const getOrganizationInfo = asyncHandler(async (req, res) => {
    const adminId = new mongoose.Types.ObjectId(req.user.userId);

    const adminOrgs = await AdminOrg.aggregate([
        {
            $match: {
                $or: [{ primaryAdmin: adminId }, { secondaryAdmin: adminId }],
            },
        },
        {
            $lookup: {
                from: "organizations",
                localField: "organizationId",
                foreignField: "_id",
                as: "organization",
            },
        },
        {
            $unwind: "$organization",
        },
        {
            $project: {
                organizationId: "$organization._id",
                organizationName: "$organization.name",
            },
        },
    ]);

    const organizationInfo = {};

    for (const org of adminOrgs) {
        const teams = await Team.find({
            organizationId: org.organizationId,
        })
            .select("_id teamName")
            .sort({ teamName: 1 })
            .lean();

        organizationInfo[org.organizationName] = {
            organizationId: org.organizationId,
            teams,
        };
    }

    return successResponse(res, "Organization info fetched", organizationInfo);
}, "ADMIN_GET_ORG_INFO_ERROR");

export default getOrganizationInfo;
