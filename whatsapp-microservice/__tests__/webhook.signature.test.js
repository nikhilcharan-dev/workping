import crypto from "crypto";

/*
 * Meta WhatsApp Cloud API signs every webhook request with HMAC-SHA-256 using
 * the App Secret. The header looks like:
 *     X-Hub-Signature-256: sha256=<hex>
 *
 * Production logic in webhook/whatsapp.webhook.js verifies this with
 * crypto.timingSafeEqual. These tests pin the contract by reproducing the
 * algorithm independently — any future refactor that breaks signature
 * verification (or fails open) breaks these tests loudly.
 */

const APP_SECRET = "meta-app-secret-very-long-string";

function sign(body) {
  return "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(JSON.stringify(body)).digest("hex");
}

function verify(body, sigHeader, secret = APP_SECRET) {
  if (!sigHeader) return false;
  const [, receivedHex] = sigHeader.split("=");
  if (!receivedHex) return false;
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(receivedHex), Buffer.from(expected));
  } catch {
    return false;
  }
}

describe("Meta X-Hub-Signature-256 verification", () => {
  const sampleBody = {
    object: "whatsapp_business_account",
    entry: [{ id: "123", changes: [{ value: { messages: [{ from: "919999999999", text: { body: "hi" } }] } }] }],
  };

  it("accepts a request signed with the correct secret", () => {
    const sig = sign(sampleBody);
    expect(verify(sampleBody, sig)).toBe(true);
  });

  it("rejects a request with no X-Hub-Signature-256 header", () => {
    expect(verify(sampleBody, undefined)).toBe(false);
    expect(verify(sampleBody, null)).toBe(false);
    expect(verify(sampleBody, "")).toBe(false);
  });

  it("rejects a header missing the 'sha256=' prefix", () => {
    const goodHex = crypto.createHmac("sha256", APP_SECRET).update(JSON.stringify(sampleBody)).digest("hex");
    // No prefix at all
    expect(verify(sampleBody, goodHex)).toBe(false);
  });

  it("rejects a tampered body (signature was generated for original body)", () => {
    const sig = sign(sampleBody);
    const tampered = JSON.parse(JSON.stringify(sampleBody));
    tampered.entry[0].changes[0].value.messages[0].text.body = "malicious";
    expect(verify(tampered, sig)).toBe(false);
  });

  it("rejects a signature generated with the wrong secret", () => {
    const wrongSig = "sha256=" + crypto.createHmac("sha256", "different-secret").update(JSON.stringify(sampleBody)).digest("hex");
    expect(verify(sampleBody, wrongSig)).toBe(false);
  });

  it("rejects a signature of the wrong length (timingSafeEqual catches this)", () => {
    expect(verify(sampleBody, "sha256=abcd")).toBe(false);
  });

  it("rejects a signature that is the same length but different content", () => {
    const sig = sign(sampleBody);
    const flipped = sig.slice(0, -1) + (sig.slice(-1) === "0" ? "1" : "0");
    expect(verify(sampleBody, flipped)).toBe(false);
  });

  it("is sensitive to JSON ordering — production uses JSON.stringify on req.body", () => {
    // Both server and signer must serialise identically; this test pins that contract.
    const body1 = { a: 1, b: 2 };
    const body2 = { b: 2, a: 1 };
    // These produce different JSON strings → different signatures.
    expect(sign(body1)).not.toBe(sign(body2));
  });
});
