import redis from "./redis.client.js";
import { logger } from "./logger.js";

const SESSION_TTL = 48 * 60 * 60; // 48 hours (seconds) - allows multi-step flows over multiple days
const FLOW_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours - auto-clear abandoned flows
const MAX_HISTORY = 20;

function key(phone) {
  return `wa:session:${phone}`;
}

async function getSession(phone) {
  try {
    const raw = await redis.get(key(phone));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.error("[ConversationState] Failed to retrieve session, treating as new:", error.message);
    return null;
  }
}

async function saveSession(phone, session) {
  try {
    session.lastActivity = Date.now();
    await redis.set(key(phone), JSON.stringify(session), "EX", SESSION_TTL);
  } catch (error) {
    logger.error("[ConversationState] Failed to save session (context will be lost on reload):", error.message);
  }
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

  // Auto-clear flows that have timed out (abandoned for 24+ hours)
  const flowAge = Date.now() - session.lastActivity;
  if (flowAge > FLOW_TIMEOUT_MS) {
    await clearFlow(phone);
    return null;
  }

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
