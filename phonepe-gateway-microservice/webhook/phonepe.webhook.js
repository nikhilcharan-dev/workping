import axios from "axios";
import crypto from "node:crypto";
import redis from "../config/redis.js";

const USERNAME = process.env.WEBHOOK_USERNAME;
const PASSWORD = process.env.WEBHOOK_PASSWORD;
const ORIGIN_WEBHOOK_URL = process.env.ORIGIN_WEBHOOK_URL;

// PhonePe HMAC secret for X-Verify header (set in PhonePe merchant dashboard)
const PHONEPE_WEBHOOK_SECRET = process.env.PHONEPE_WEBHOOK_SECRET;

// Idempotency window: ignore duplicate webhook deliveries within 10 minutes
const IDEMPOTENCY_TTL = 10 * 60;

// Valid order state transitions — prevents replaying old states
const VALID_TRANSITIONS = {
  PENDING: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
  COMPLETED: new Set([]),
  FAILED: new Set([]),
  CANCELLED: new Set([]),
};

function verifyBasicAuth(authHeader) {
  if (!authHeader) return false;
  const expected = crypto.createHash("sha256").update(`${USERNAME}:${PASSWORD}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(authHeader.trim()), Buffer.from(expected));
  } catch {
    return false;
  }
}

function verifyXVerify(rawBody, xVerifyHeader) {
  // Fail closed: if the secret isn't configured, reject all webhooks. Previously
  // missing secret skipped HMAC entirely, leaving only basic auth as the gate.
  if (!PHONEPE_WEBHOOK_SECRET) return false;
  if (!xVerifyHeader || !rawBody) return false;
  const [signature] = xVerifyHeader.split("###");
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", PHONEPE_WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature.trim()), Buffer.from(expected));
  } catch {
    return false;
  }
}

const phonepeWebhook = async (req, res) => {
  try {
    // 1. Basic auth verification
    if (!verifyBasicAuth(req.headers["authorization"])) {
      console.warn("[Webhook] Unauthorized: basic auth failed");
      return res.status(401).send("Unauthorized");
    }

    // 2. PhonePe HMAC signature verification (X-Verify header).
    // req.rawBody is captured by the express.json verify hook in service.js so
    // the HMAC operates on the exact bytes PhonePe signed (re-serializing the
    // parsed body would not be byte-stable).
    const rawBody = req.rawBody;
    if (!verifyXVerify(rawBody, req.headers["x-verify"])) {
      console.warn("[Webhook] Unauthorized: X-Verify signature mismatch");
      return res.status(401).send("Unauthorized");
    }

    const { event, payload } = req.body;

    if (!payload || !payload.merchantOrderId) {
      console.error("[Webhook] Invalid payload received");
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { merchantOrderId, state, amount, metaInfo, paymentDetails } = payload;

    // 3. Idempotency check — deduplicate retried webhook deliveries
    // Re-delivery of terminal states (COMPLETED/FAILED/CANCELLED) is idempotent and returns 200.
    const idempotencyKey = `webhook:seen:${merchantOrderId}:${state}`;
    const alreadyProcessed = await redis.set(idempotencyKey, "1", { NX: true, EX: IDEMPOTENCY_TTL });
    if (!alreadyProcessed) {
      console.log(`[Webhook] Duplicate delivery (idempotent) for order ${merchantOrderId} state=${state}`);
      return res.status(200).json({ success: true, note: "duplicate" });
    }

    // 4. State machine — reject invalid transitions (terminal states allow no further transitions)
    // COMPLETED, FAILED, CANCELLED have empty transition sets, making them absorbing states.
    const stateKey = `order:state:${merchantOrderId}`;
    const currentState = (await redis.get(stateKey)) || "PENDING";
    const allowed = VALID_TRANSITIONS[currentState];
    if (allowed !== undefined && !allowed.has(state)) {
      console.warn(`[Webhook] Invalid transition ${currentState} → ${state} for order ${merchantOrderId}`);
      return res.status(409).json({ error: `Invalid state transition: ${currentState} → ${state}` });
    }
    // Persist new state (keep 30 days for auditing)
    await redis.set(stateKey, state, { EX: 30 * 24 * 60 * 60 });

    const filtered = {
      merchantOrderId,
      amount,
      state,
      userId: metaInfo?.udf1,
      paymentDetails,
      event,
    };

    // Sign the exact bytes we forward. The centralized server captures req.rawBody
    // in its express.json verify callback and re-computes the same HMAC, so any
    // mutation in transit (or by a man-in-the-middle without the shared secret) fails verification.
    const forwardBody = JSON.stringify(filtered);
    const forwardSignature = crypto
      .createHmac("sha256", process.env.ORIGIN_WEBHOOK_SECRET)
      .update(forwardBody)
      .digest("hex");

    console.log(`[Webhook] Forwarding order ${merchantOrderId} (${state}) to backend`);

    const response = await axios.post(ORIGIN_WEBHOOK_URL, forwardBody, {
      headers: {
        "X-Webhook-Signature": forwardSignature,
        "Content-Type": "application/json",
      },
    });

    console.log(`[Webhook] Backend responded ${response.status} for order ${merchantOrderId}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[Webhook] Error:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Failed to process webhook" });
  }
};

export { verifyBasicAuth };
export default phonepeWebhook;
