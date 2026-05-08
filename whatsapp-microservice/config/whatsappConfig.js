import { Router } from "express";
import "dotenv/config";

const router = Router();

/* The /webhook with API Type GET is used initially once to verify if the redirect server is verified server */
router.get("/webhook", async (req, res) => {
    try {
        if (
            req.query["hub.mode"] === "subscribe" &&
            req.query["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN
        ) {
            console.log("WhatsApp webhook verified");
            return res.status(200).send(req.query["hub.challenge"]);
        }
        console.log("Webhook verification failed");
        return res.status(400);
    } catch (err) {
        console.log(err);
        return res.status(500);
    }
});

export default router;
