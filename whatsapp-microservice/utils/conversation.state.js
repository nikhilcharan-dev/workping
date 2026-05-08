import redis from "./redis.client.js";

const SESSION_TTL = 30 * 60; // 30 minutes (seconds)
const MAX_HISTORY = 20;

function key(phone) {
    return `wa:session:${phone}`;
}

async function getSession(phone) {
    const raw = await redis.get(key(phone));
    return raw ? JSON.parse(raw) : null;
}

async function saveSession(phone, session) {
    session.lastActivity = Date.now();
    await redis.set(key(phone), JSON.stringify(session), "EX", SESSION_TTL);
}

function emptySession() {
    return {
        flow: null,
        step: null,
        pendingData: {},
        history: [],
        lastActivity: Date.now(),
    };
}

export async function addMessage(phone, role, content) {
    const session = (await getSession(phone)) || emptySession();
    session.history.push({ role, content, timestamp: Date.now() });
    if (session.history.length > MAX_HISTORY) session.history.shift();
    await saveSession(phone, session);
}

export async function getHistory(phone) {
    const session = await getSession(phone);
    return session ? session.history : [];
}

export async function startFlow(phone, flow, step, data = {}) {
    const session = (await getSession(phone)) || emptySession();
    session.flow = flow;
    session.step = step;
    session.pendingData = data;
    await saveSession(phone, session);
}

export async function getFlow(phone) {
    const session = await getSession(phone);
    if (!session || !session.flow) return null;
    return { flow: session.flow, step: session.step, pendingData: session.pendingData };
}

export async function updateFlowData(phone, data) {
    const session = await getSession(phone);
    if (!session) return;
    Object.assign(session.pendingData, data);
    await saveSession(phone, session);
}

export async function clearFlow(phone) {
    const session = await getSession(phone);
    if (!session) return;
    session.flow = null;
    session.step = null;
    session.pendingData = {};
    await saveSession(phone, session);
}
