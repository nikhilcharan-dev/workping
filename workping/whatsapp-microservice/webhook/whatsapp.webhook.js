import { Router } from "express";
import messagePipeline from "../pipeline/message.pipeline.js";
import { normalizeWhatsAppPayload } from "./whatsapp.normalizer.js";

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

// Next Version needs
// - status updates if user doesn't reply to a specific message prompt again.
router.post("/webhook", async (req, res) => {
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
