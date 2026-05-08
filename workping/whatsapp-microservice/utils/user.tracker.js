import redis from "./redis.client.js";

const KEY_TTL = 365 * 24 * 60 * 60; // 1 year

function key(phone) {
    return `wa:known:${phone}`;
}

/**
 * Returns true only the first time this phone is seen (ever).
 * Uses Redis SET NX so it's safe across restarts and multiple instances.
 */
export async function isFirstTimeUser(phone) {
    // SET NX returns 1 if key was newly created, null if it already existed
    const set = await redis.set(key(phone), "1", "EX", KEY_TTL, "NX");
    return set === "OK";
}

export function getWelcomeMessage(username) {
    const name = username || "there";
    return (
        `Hi ${name}! Welcome to *WorkPing Assistant*.\n\n` +
        `I can help you with attendance, leaves, HR queries and more.\n\n` +
        `*1* — Attendance status\n` +
        `*2* — Apply for leave\n` +
        `*3* — Leave balance\n` +
        `*4* — My leave requests\n` +
        `*5* — FRS / Biometric issue\n` +
        `*6* — Company policies\n` +
        `*7* — File a complaint\n\n` +
        `_Reply with a number or just ask me anything._`
    );
}
