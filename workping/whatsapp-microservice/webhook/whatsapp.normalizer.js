export function normalizeWhatsAppPayload(value) {
    const message = value.messages?.[0];

    if (!message || message.type !== "text") {
        return null;
    }

    const contact = value.contacts?.find((c) => c.wa_id === message.from);

    const normalized = {
        messageId: message.id,
        from: message.from,
        username: contact?.profile?.name || "User",
        text: message.text?.body?.trim() || "",
        timestamp: Number(message.timestamp),
        type: "text",
    };

    return normalized;
}
