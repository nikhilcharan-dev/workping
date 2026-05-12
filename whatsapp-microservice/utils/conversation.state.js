import redis from "./redis.client.js";
import Session from "../models/session.model.js";
import { logger } from "./logger.js";

const SESSION_TTL = 48 * 60 * 60; // 48 hours (seconds) - allows multi-step flows over multiple days
const FLOW_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours - auto-clear abandoned flows
const MAX_HISTORY = 20;

function key(phone) {
  return `wa:session:${phone}`;
}

/**
 * Retrieves the session for a given phone number.
 * Strategy: Redis (Primary) -> MongoDB (Fallback)
 */
async function getSession(phone) {
  // 1. Try Redis
  try {
    const raw = await redis.get(key(phone));
    if (raw) return JSON.parse(raw);
  } catch (error) {
    logger.error(`[ConversationState] Redis read failed for ${phone}:`, error.message);
  }

  // 2. Fallback to MongoDB
  try {
    const doc = await Session.findOne({ phone }).lean();
    if (doc) {
      logger.info(`[ConversationState] Recovered session from MongoDB for ${phone}`);
      // Asynchronously attempt to re-populate Redis
      redis.set(key(phone), JSON.stringify(doc), "EX", SESSION_TTL).catch((e) => {
        logger.warn(`[ConversationState] Failed to re-populate Redis for ${phone}:`, e.message);
      });
      return doc;
    }
  } catch (error) {
    logger.error(`[ConversationState] MongoDB read failed for ${phone}:`, error.message);
  }

  return null;
}

/**
 * Saves the session for a given phone number.
 * Strategy: Dual-write to Redis and MongoDB.
 */
async function saveSession(phone, session) {
  session.lastActivity = Date.now();

  // 1. Save to Redis (fast path)
  try {
    await redis.set(key(phone), JSON.stringify(session), "EX", SESSION_TTL);
  } catch (error) {
    logger.error(`[ConversationState] Redis save failed for ${phone}:`, error.message);
  }

  // 2. Save to MongoDB (persistent backup)
  try {
    await Session.findOneAndUpdate(
      { phone },
      {
        $set: {
          flow: session.flow,
          step: session.step,
          pendingData: session.pendingData,
          history: session.history,
          lastActivity: session.lastActivity,
          lastActivityAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    logger.error(`[ConversationState] MongoDB save failed for ${phone}:`, error.message);
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
