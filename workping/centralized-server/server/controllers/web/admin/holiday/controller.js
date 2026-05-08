import Holiday from "#models/Holiday.js";
import { successResponse, errorResponse } from "#utils/response.helper.js";
import { validateObjectId, validateString, validateDate, validateEnum } from "#utils/validators.js";

const addHoliday = asyncHandler(async (req, res) => {
    let { name, type, date, description, organizationId } = req.body;

    const orgIdValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

    const nameValidation = validateString(name, "Holiday name", { required: true, minLength: 2, maxLength: 100 });
    if (!nameValidation.valid) return errorResponse(res, nameValidation.error);

    const typeValidation = validateEnum(type, ["public", "organization"], "Holiday type");
    if (!typeValidation.valid) return errorResponse(res, typeValidation.error);

    const dateValidation = validateDate(date, "Holiday date");
    if (!dateValidation.valid) return errorResponse(res, dateValidation.error);

    const holidayData = {
        organizationId: organizationId,
        name: nameValidation.normalized,
        type: typeValidation.normalized,
        date: dateValidation.normalized,
        description: description ? String(description).trim() : "",
    };

    const holiday = await Holiday.create(holidayData);
    return successResponse(res, "Holiday added successfully", holiday, 201);
}, "ADMIN_ADD_HOLIDAY_ERROR");

const getHolidays = asyncHandler(async (req, res) => {
    const { organizationId, type, year } = req.query;

    const orgIdValidation = validateObjectId(organizationId, "Organization ID");
    if (!orgIdValidation.valid) return errorResponse(res, orgIdValidation.error);

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
}, "ADMIN_GET_HOLIDAYS_ERROR");

const getHolidayById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const idValidation = validateObjectId(id, "Holiday ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    const holiday = await Holiday.findById(id).lean();
    if (!holiday) return errorResponse(res, "Holiday not found", 404);

    return successResponse(res, "Holiday fetched successfully", holiday);
}, "ADMIN_GET_HOLIDAY_BY_ID_ERROR");

const updateHoliday = asyncHandler(async (req, res) => {
    const { _id } = req.body;

    const idValidation = validateObjectId(_id, "Holiday ID");
    if (!idValidation.valid) return errorResponse(res, idValidation.error);

    const updates = {};
    if (req.body.name !== undefined) {
        const nameValidation = validateString(req.body.name, "Holiday name", { minLength: 2, maxLength: 100 });
        if (!nameValidation.valid) return errorResponse(res, nameValidation.error);
        updates.name = nameValidation.normalized;
    }

    if (req.body.type !== undefined) {
        const typeValidation = validateEnum(req.body.type, ["public", "organization"], "Holiday type");
        if (!typeValidation.valid) return errorResponse(res, typeValidation.error);
        updates.type = typeValidation.normalized;
    }

    if (req.body.date !== undefined) {
        const dateValidation = validateDate(req.body.date, "Holiday date");
        if (!dateValidation.valid) return errorResponse(res, dateValidation.error);
        updates.date = dateValidation.normalized;
    }

    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();

    const updatedHoliday = await Holiday.findByIdAndUpdate(_id, updates, { new: true, runValidators: true }).lean();
    if (!updatedHoliday) return errorResponse(res, "Holiday not found", 404);

    return successResponse(res, "Holiday updated successfully", updatedHoliday);
}, "ADMIN_UPDATE_HOLIDAY_ERROR");

const deleteHolidays = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return errorResponse(res, "Holiday IDs must be a non-empty array");
    }

    for (const id of ids) {
        const idValidation = validateObjectId(id, "Holiday ID");
        if (!idValidation.valid) return errorResponse(res, idValidation.error);
    }

    const result = await Holiday.deleteMany({ _id: { $in: ids } });
    return successResponse(res, "Holidays deleted successfully", { deletedCount: result.deletedCount });
}, "ADMIN_DELETE_HOLIDAY_ERROR");

export { addHoliday, getHolidays, getHolidayById, updateHoliday, deleteHolidays };
