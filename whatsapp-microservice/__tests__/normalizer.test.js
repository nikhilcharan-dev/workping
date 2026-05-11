import { normalizeWhatsAppPayload } from "../webhook/whatsapp.normalizer.js";

function makeValue({ messageType = "text", text = "hi", from = "919999999999", username = "Alice", id = "wamid.1", timestamp = "1700000000" } = {}) {
  return {
    contacts: [{ profile: { name: username }, wa_id: from }],
    messages: [
      messageType === "text"
        ? { id, from, type: "text", timestamp, text: { body: text } }
        : { id, from, type: messageType, timestamp },
    ],
  };
}

describe("normalizeWhatsAppPayload — text messages", () => {
  it("extracts text body, sender, message id, and timestamp", () => {
    const out = normalizeWhatsAppPayload(makeValue({ text: "leave balance" }));
    expect(out).toEqual({
      messageId: "wamid.1",
      from: "919999999999",
      username: "Alice",
      text: "leave balance",
      timestamp: 1700000000,
      type: "text",
    });
  });

  it("trims surrounding whitespace from the body", () => {
    const out = normalizeWhatsAppPayload(makeValue({ text: "   hello   " }));
    expect(out.text).toBe("hello");
  });

  it("coerces the timestamp string into a number", () => {
    const out = normalizeWhatsAppPayload(makeValue({ timestamp: "1700000123" }));
    expect(typeof out.timestamp).toBe("number");
    expect(out.timestamp).toBe(1700000123);
  });

  it("falls back to 'User' when no contact profile name is present", () => {
    const value = makeValue();
    delete value.contacts;
    const out = normalizeWhatsAppPayload(value);
    expect(out.username).toBe("User");
  });

  it("matches contact by wa_id, not array order", () => {
    const value = {
      contacts: [
        { profile: { name: "Other" }, wa_id: "910000000000" },
        { profile: { name: "Target" }, wa_id: "919999999999" },
      ],
      messages: [{ id: "x", from: "919999999999", type: "text", timestamp: "1", text: { body: "hi" } }],
    };
    expect(normalizeWhatsAppPayload(value).username).toBe("Target");
  });

  it("falls back to empty string when text body is missing", () => {
    const value = {
      contacts: [{ profile: { name: "A" }, wa_id: "1" }],
      messages: [{ id: "x", from: "1", type: "text", timestamp: "1" }],
    };
    expect(normalizeWhatsAppPayload(value).text).toBe("");
  });
});

describe("normalizeWhatsAppPayload — unsupported message types", () => {
  it.each(["image", "audio", "video", "sticker", "interactive", "location", "document"])(
    "returns null for type=%s (Phase 1 only handles text)",
    (type) => {
      expect(normalizeWhatsAppPayload(makeValue({ messageType: type }))).toBeNull();
    }
  );

  it("returns null when there is no message at all", () => {
    expect(normalizeWhatsAppPayload({ messages: [] })).toBeNull();
    expect(normalizeWhatsAppPayload({})).toBeNull();
  });
});
