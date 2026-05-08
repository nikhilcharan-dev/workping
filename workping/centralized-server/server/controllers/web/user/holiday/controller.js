import User from "#models/User.js";
import Holiday from "#models/Holiday.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateEnum } from "#utils/validators.js";

const getHolidays = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { type, year } = req.query;

    const user = await User.findById(userId).lean();
    if (!user || !user.organizationId) {
        return errorResponse(res, "User organization not found", 400);
    }

    const organizationId = user.organizationId;
    const query = { organizationId };

    if (type) {
        const typeValidation = validateEnum(type, ["public", "organization"], "Holiday type");
        if (typeValidation.valid) query.type = typeValidation.normalized;
    }

    if (year) {
        const y = parseInt(year);
        if (!isNaN(y)) {
            query.date = {
                $gte: new Date(`${y}-01-01`),
                $lte: new Date(`${y}-12-31`),
            };
        }
    }

    const holidays = await Holiday.find(query).sort({ date: 1 }).lean();
    return successResponse(res, "Holidays fetched successfully", holidays);
}, "USER_GET_HOLIDAYS_ERROR");

const getHolidayById = asyncHandler(async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;

    const user = await User.findById(userId).lean();
    if (!user || !user.organizationId) {
        return errorResponse(res, "User organization not found", 400);
    }

    const holiday = await Holiday.findOne({ _id: id, organizationId: user.organizationId }).lean();
    if (!holiday) return errorResponse(res, "Holiday not found", 404);

    return successResponse(res, "Holiday fetched successfully", holiday);
}, "USER_GET_HOLIDAY_BY_ID_ERROR");

export { getHolidays, getHolidayById };
