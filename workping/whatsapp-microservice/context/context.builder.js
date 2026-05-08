import originClient from "../utils/origin.client.js";

const ATTENDANCE_INTENTS = new Set(["ATTENDANCE_STATUS"]);
const LEAVE_INTENTS = new Set(["LEAVE_REQUEST", "LEAVE_STATUS", "LEAVE_BALANCE", "CONFIRM", "CANCEL"]);
const SALARY_INTENTS = new Set(["SALARY_QUERY"]);
const SHIFT_INTENTS = new Set(["SHIFT_INFO"]);
const HOLIDAY_INTENTS = new Set(["HOLIDAY_INFO"]);

/**
 * WhatsApp sends wa_id with country code (e.g. 917815873262).
 * The DB stores 10-digit numbers. Strip the 91 prefix before lookup.
 */
function stripCountryCode(phone) {
    if (/^91\d{10}$/.test(phone)) return phone.slice(2);
    return phone;
}

async function getEmployee(phone) {
    try {
        const normalized = stripCountryCode(phone);
        const { data } = await originClient.get(`/internal/employee/by-phone/${encodeURIComponent(normalized)}`);
        return data.found ? data : null;
    } catch {
        return null;
    }
}

async function getAttendanceToday(userId) {
    try {
        const { data } = await originClient.get(`/internal/attendance/today/${userId}`);
        return data.record;
    } catch {
        return null;
    }
}

async function getAttendanceWeek(userId) {
    try {
        const { data } = await originClient.get(`/internal/attendance/week/${userId}`);
        return data.records ?? [];
    } catch {
        return [];
    }
}

async function getLeaveBalance(userId) {
    try {
        const { data } = await originClient.get(`/internal/leave/balance/${userId}`);
        return data;
    } catch {
        return null;
    }
}

async function getRecentLeaves(userId) {
    try {
        const { data } = await originClient.get(`/internal/leave/recent/${userId}`);
        return data.leaves ?? [];
    } catch {
        return [];
    }
}

async function getSalarySlip(userId) {
    try {
        const { data } = await originClient.get(`/internal/salary/${userId}`);
        return data.salary ?? null;
    } catch {
        return null;
    }
}

async function getUserShift(userId) {
    try {
        const { data } = await originClient.get(`/internal/shift/${userId}`);
        return data.shift ?? null;
    } catch {
        return null;
    }
}

async function getUpcomingHolidays(organizationId) {
    try {
        const { data } = await originClient.get(`/internal/holidays/${organizationId}`);
        return data.holidays ?? [];
    } catch {
        return [];
    }
}

export async function buildContext(internalMessage, intentResult) {
    const intent = intentResult?.intent;

    const employee = await getEmployee(internalMessage.from);

    const baseEmployee = employee ?? {
        phone: internalMessage.from,
        name: internalMessage.username,
        userId: null,
        found: false,
    };

    const systemData = {};

    if (employee?.userId) {
        if (ATTENDANCE_INTENTS.has(intent)) {
            const [todayRecord, weekRecords] = await Promise.all([
                getAttendanceToday(employee.userId),
                getAttendanceWeek(employee.userId),
            ]);
            systemData.attendance = { today: todayRecord, week: weekRecords };
        }

        if (LEAVE_INTENTS.has(intent)) {
            const [balance, recent] = await Promise.all([
                getLeaveBalance(employee.userId),
                getRecentLeaves(employee.userId),
            ]);
            systemData.leave = { balance, recent };
        }

        if (SALARY_INTENTS.has(intent)) {
            systemData.salary = await getSalarySlip(employee.userId);
        }

        if (SHIFT_INTENTS.has(intent)) {
            systemData.shift = await getUserShift(employee.userId);
        }

        if (HOLIDAY_INTENTS.has(intent) && employee.organizationId) {
            systemData.holidays = await getUpcomingHolidays(employee.organizationId);
        }
    }

    return {
        employee: baseEmployee,
        intent: intentResult,
        message: {
            text: internalMessage.text,
            timestamp: internalMessage.timestamp,
        },
        systemData,
    };
}
