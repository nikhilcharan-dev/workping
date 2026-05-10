import { Router } from "express";
import crypto from "crypto";
import messagePipeline from "../pipeline/message.pipeline.js";
import { normalizeWhatsAppPayload } from "./whatsapp.normalizer.js";

const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

function verifyMetaSignature(req) {
    if (!WHATSAPP_APP_SECRET) return true; // skip if not configured (dev only)
    const sigHeader = req.headers["x-hub-signature-256"];
    if (!sigHeader) return false;
    const [, receivedHex] = sigHeader.split("=");
    if (!receivedHex) return false;
    const expected = crypto
        .createHmac("sha256", WHATSAPP_APP_SECRET)
        .update(JSON.stringify(req.body))
        .digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(receivedHex), Buffer.from(expected));
    } catch {
        return false;
    }
}

const router = Router();

function handleStatusUpdate(status) {
    const { id, status: state } = status;
    console.log(`Message ${id} → ${state}`);
}

const processedMessageIds = new Set();
const MAX_DEDUP_SIZE = 5000;

function isDuplicate(messageId) {
    if (processedMessageIds.has(messageId)) return true;
    if (processedMessageIds.size >= MAX_DEDUP_SIZE) {
        const oldest = processedMessageIds.values().next().value;
        processedMessageIds.delete(oldest);
    }
    processedMessageIds.add(messageId);
    setTimeout(() => processedMessageIds.delete(messageId), 5 * 60 * 1000);
    return false;
}

router.post("/webhook", async (req, res) => {
    if (!verifyMetaSignature(req)) {
        console.warn("[Webhook] X-Hub-Signature-256 verification failed");
        return res.sendStatus(401);
    }

    try {
        const entry = req.body?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;

        if (!value) {
            return res.sendStatus(200);
        }

        if (value.statuses?.length) {
            handleStatusUpdate(value.statuses[0]);
            return res.sendStatus(200);
        }

        if (!value.messages?.length) {
            return res.sendStatus(200);
        }

        const messages = value.messages;

        for (const msg of messages) {
            const internalMessage = normalizeWhatsAppPayload({
                ...value,
                messages: [msg],
            });

            if (!internalMessage) continue;
            if (isDuplicate(internalMessage.messageId)) continue;

            await messagePipeline.process(internalMessage);
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error("[WEBHOOK] Error:", err.message);
        return res.sendStatus(500);
    }
});

export default router;
