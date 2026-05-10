import axios from "axios";

const API_KEY = process.env.WHATSAPP_API_KEY;
const META_BASE_URI = process.env.WHATSAPP_META_BASE_URI;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const metaAxios = axios.create({
  baseURL: `${META_BASE_URI}/${PHONE_NUMBER_ID}`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 10000,
});

export async function sendWhatsAppMessage({ to, text }) {
  try {
    const result = await metaAxios.post("/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    });
  } catch (err) {
    const msg =
      err.response?.data?.error?.message || err.response?.data?.message || err.message || "Unknown WhatsApp API error";
    console.error("[SENDER] Failed:", msg, "status:", err.response?.status);
    throw new Error(msg);
  }
}
