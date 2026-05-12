import { Router } from "express";
import { logger } from "../utils/logger.js";
import { getStats } from "../utils/analytics.js";
import { getGuardStats, getGuardedUsers, unbanUser, unrateLimitUser } from "../utils/rate.limiter.js";
import {
  healthCheck,
  getProvider,
  setProvider,
  getProviderConfig,
  updateProviderConfig,
  getRawProviderConfig,
  chat,
} from "../utils/llm.provider.js";
import { syncToEnv, buildEnvUpdates } from "../utils/env.sync.js";
import llmAnalyticsRouter from "./llm.analytics.js";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", (req, res) => {
  res.json({ ...getStats(), ...getGuardStats() });
});

// GET /api/dashboard/health
router.get("/health", async (req, res) => {
  const llm = await healthCheck();
  res.json(llm);
});

// GET /api/dashboard/provider
router.get("/provider", (req, res) => {
  res.json({ provider: getProvider() });
});

// POST /api/dashboard/provider  { "provider": "ollama" | "bedrock" }
router.post("/provider", (req, res) => {
  const { provider } = req.body;
  if (!provider) {
    return res.status(400).json({ error: "provider is required" });
  }
  try {
    const active = setProvider(provider);
    logger.info("LLM provider switched to:", active);
    res.json({ provider: active });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/dashboard/config/:provider
router.get("/config/:provider", (req, res) => {
  try {
    res.json(getProviderConfig(req.params.provider));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/dashboard/config/:provider  { ...config fields }
router.put("/config/:provider", (req, res) => {
  try {
    const updated = updateProviderConfig(req.params.provider, req.body);
    logger.info("Config updated for:", req.params.provider);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/dashboard/sync  { "provider": "ollama" | "bedrock" }
// Writes current runtime config to .env file on disk
// SECURITY: Only whitelisted configuration keys are allowed (see env.sync.js)
router.post("/sync", (req, res) => {
  try {
    const provider = req.body.provider || getProvider();
    const rawConfig = getRawProviderConfig(provider);
    const envUpdates = buildEnvUpdates(provider, rawConfig);
    syncToEnv(envUpdates);

    logger.info("Config synced to .env for:", provider);
    res.json({ synced: true, provider, keys: Object.keys(envUpdates) });
  } catch (err) {
    logger.error("Sync to disk failed:", err.message);
    // Don't expose detailed error messages that might reveal security restrictions
    res.status(400).json({ error: "Configuration sync failed. Check that all required values are set." });
  }
});

// POST /api/dashboard/test-chat  { "message": "Hello" }
// Sends a test message to the active LLM and returns the response
router.post("/test-chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }
  try {
    const provider = getProvider();
    const startTime = Date.now();
    const response = await chat([{ role: "user", content: message }], { temperature: 0.5, maxTokens: 256 });
    const elapsed = Date.now() - startTime;
    res.json({ ok: true, provider, response, elapsed });
  } catch (err) {
    logger.error("[TEST-CHAT] Failed:", err.message);
    res.json({ ok: false, provider: getProvider(), error: err.message });
  }
});

// GET /api/dashboard/guarded-users
router.get("/guarded-users", (req, res) => {
  res.json(getGuardedUsers());
});

// Normalize to WhatsApp format (91XXXXXXXXXX) so it matches rate limiter keys
function toWAPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// POST /api/dashboard/unban  { "phone": "91xxxxxxxxxx" or "xxxxxxxxxx" }
router.post("/unban", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required" });
  const normalized = toWAPhone(phone);
  const ok = unbanUser(normalized);
  res.json({ ok, phone: normalized });
});

// POST /api/dashboard/unrestrict  { "phone": "91xxxxxxxxxx" or "xxxxxxxxxx" }
router.post("/unrestrict", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required" });
  const normalized = toWAPhone(phone);
  const ok = unrateLimitUser(normalized);
  res.json({ ok, phone: normalized });
});

// Mount LLM analytics routes
router.use(llmAnalyticsRouter);

export default router;
