import Subscription from "#models/Subscription.js";
import OrgAdmin from "#models/Admin.Org.js";
import User from "#models/User.js";
import Team from "#models/Team.js";
import Project from "#models/Project.js";

// Applied when admin has no active subscription
const FREE_TIER = {
    name: "Free",
    maxOrganizations: 1,
    maxEmployees: 10,
    maxTeams: 3,
    maxProjects: 5,
};

async function getAdminPlan(adminId) {
    const sub = await Subscription.findOne({ adminId, status: "ACTIVE" })
        .populate("planId")
        .sort({ createdAt: -1 })
        .lean();
    return sub?.planId ?? FREE_TIER;
}

async function getAdminOrgIds(adminId) {
    const records = await OrgAdmin.find({ primaryAdmin: adminId }, { organizationId: 1 }).lean();
    return records.map((r) => r.organizationId);
}

function limitMsg(planName, resource, max) {
    return `Your ${planName} plan allows up to ${max} ${resource}. Upgrade your plan to add more.`;
}

export async function checkOrgLimit(adminId) {
    const plan = await getAdminPlan(adminId);
    const max = plan.maxOrganizations ?? FREE_TIER.maxOrganizations;
    const count = await OrgAdmin.countDocuments({ primaryAdmin: adminId });
    if (count >= max) {
        return { allowed: false, message: limitMsg(plan.name, max === 1 ? "organization" : "organizations", max) };
    }
    return { allowed: true };
}

export async function checkEmployeeLimit(adminId, adding = 1) {
    const plan = await getAdminPlan(adminId);
    const max = plan.maxEmployees ?? FREE_TIER.maxEmployees;
    const orgIds = await getAdminOrgIds(adminId);
    if (!orgIds.length) return { allowed: true };
    const count = await User.countDocuments({ organizationId: { $in: orgIds } });
    if (count + adding > max) {
        const remaining = Math.max(0, max - count);
        return {
            allowed: false,
            message: `Your ${plan.name} plan allows up to ${max} employees. You currently have ${count} and can add ${remaining} more. Upgrade your plan to add more.`,
        };
    }
    return { allowed: true };
}

export async function checkTeamLimit(adminId) {
    const plan = await getAdminPlan(adminId);
    const max = plan.maxTeams ?? FREE_TIER.maxTeams;
    const orgIds = await getAdminOrgIds(adminId);
    if (!orgIds.length) return { allowed: true };
    const count = await Team.countDocuments({ organizationId: { $in: orgIds } });
    if (count >= max) {
        return { allowed: false, message: limitMsg(plan.name, "teams", max) };
    }
    return { allowed: true };
}

export async function checkProjectLimit(adminId) {
    const plan = await getAdminPlan(adminId);
    const max = plan.maxProjects ?? FREE_TIER.maxProjects;
    const orgIds = await getAdminOrgIds(adminId);
    if (!orgIds.length) return { allowed: true };
    const count = await Project.countDocuments({ organizationId: { $in: orgIds } });
    if (count >= max) {
        return { allowed: false, message: limitMsg(plan.name, "projects", max) };
    }
    return { allowed: true };
}
