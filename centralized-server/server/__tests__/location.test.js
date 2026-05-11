// Unit tests for utils/location.js — server-side geofence validator.
// Pure-function logic with no I/O, so no DB or Redis needed.
import { validate3DLocation } from "../utils/location.js";

// ── No-config fail-open ──────────────────────────────────────────────────────
describe("validate3DLocation — no organization config", () => {
  it("allows by default when the org has no location restrictions", () => {
    const res = validate3DLocation({}, {});
    expect(res.allowed).toBe(true);
    expect(res.message).toMatch(/no location restrictions/i);
  });

  it("treats empty IPWhitelist + missing coordinates + missing msl as no-config", () => {
    const res = validate3DLocation({ gps: { latitude: 0, longitude: 0 } }, { IPWhitelist: [] });
    expect(res.allowed).toBe(true);
  });
});

// ── IP whitelist ────────────────────────────────────────────────────────────
describe("validate3DLocation — IP whitelist", () => {
  it("rejects when client IP is not in the whitelist", () => {
    const res = validate3DLocation(
      { publicIp: "8.8.8.8" },
      { IPWhitelist: ["1.2.3.4"] }
    );
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/unauthorized network/i);
  });

  it("accepts when client IP is in the whitelist", () => {
    const res = validate3DLocation(
      { publicIp: "1.2.3.4" },
      { IPWhitelist: ["1.2.3.4"] }
    );
    expect(res.allowed).toBe(true);
  });

  it("falls back to serverIp when publicIp is missing", () => {
    const res = validate3DLocation(
      {},
      { IPWhitelist: ["10.0.0.1"] },
      "10.0.0.1"
    );
    expect(res.allowed).toBe(true);
  });

  it("treats 0.0.0.0 as universal-access sentinel", () => {
    const res = validate3DLocation(
      { publicIp: "8.8.8.8" },
      { IPWhitelist: ["0.0.0.0"] }
    );
    expect(res.allowed).toBe(true);
  });

  it("treats 0.0.0.0/0 as universal-access sentinel", () => {
    const res = validate3DLocation(
      { publicIp: "8.8.8.8" },
      { IPWhitelist: ["0.0.0.0/0"] }
    );
    expect(res.allowed).toBe(true);
  });
});

// ── Geofence (radius around primary coordinates) ─────────────────────────────
describe("validate3DLocation — GPS radius fence", () => {
  // Approx New Delhi
  const office = { coordinates: [77.2090, 28.6139] }; // [lng, lat] GeoJSON order

  it("rejects when GPS payload is missing entirely", () => {
    const res = validate3DLocation({}, office);
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/gps coordinates required/i);
  });

  it("rejects when GPS latitude/longitude are null", () => {
    const res = validate3DLocation(
      { gps: { latitude: null, longitude: null } },
      office
    );
    expect(res.allowed).toBe(false);
  });

  it("accepts a point that is exactly at the office", () => {
    const res = validate3DLocation(
      { gps: { latitude: 28.6139, longitude: 77.2090 } },
      office
    );
    expect(res.allowed).toBe(true);
  });

  it("accepts a point within ~500 m of the office", () => {
    // ~0.002° latitude ≈ 222 m offset
    const res = validate3DLocation(
      { gps: { latitude: 28.6159, longitude: 77.2090 } },
      office
    );
    expect(res.allowed).toBe(true);
  });

  it("rejects a point that is many kilometres away", () => {
    const res = validate3DLocation(
      { gps: { latitude: 19.0760, longitude: 72.8777 } }, // Mumbai
      office
    );
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/outside allowed region/i);
  });
});

// ── Geofence (polygon) ──────────────────────────────────────────────────────
describe("validate3DLocation — polygon fence", () => {
  // Tight square around (0,0)
  const polygonOrg = {
    coordinates: [0, 0],
    areaPins: [
      { lat: 1, lng: 1 },
      { lat: 1, lng: -1 },
      { lat: -1, lng: -1 },
      { lat: -1, lng: 1 },
    ],
  };

  it("accepts a point clearly inside the polygon", () => {
    const res = validate3DLocation(
      { gps: { latitude: 0, longitude: 0 } },
      polygonOrg
    );
    expect(res.allowed).toBe(true);
  });

  it("rejects a point clearly outside the polygon and all radius checks", () => {
    const res = validate3DLocation(
      { gps: { latitude: 50, longitude: 50 } },
      polygonOrg
    );
    expect(res.allowed).toBe(false);
  });

  it("falls through to area-pin radius when polygon test fails", () => {
    // Move polygon away from origin so origin is outside polygon,
    // then add a pin near origin so radius fallback accepts.
    const cfg = {
      coordinates: [100, 100],
      areaPins: [
        { lat: 0.001, lng: 0.001 }, // ~ 150 m from origin
      ],
    };
    const res = validate3DLocation(
      { gps: { latitude: 0, longitude: 0 } },
      cfg
    );
    expect(res.allowed).toBe(true);
  });
});

// ── Altitude check ──────────────────────────────────────────────────────────
describe("validate3DLocation — altitude (MSL) check", () => {
  it("rejects when MSL configured but altitude is missing", () => {
    const res = validate3DLocation({}, { msl: 100 });
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/altitude signal required/i);
  });

  it("accepts altitude within ±50 m tolerance", () => {
    const res = validate3DLocation(
      { altitude: { value: 120 } },
      { msl: 100 }
    );
    expect(res.allowed).toBe(true);
  });

  it("rejects altitude outside ±50 m tolerance", () => {
    const res = validate3DLocation(
      { altitude: { value: 300 } },
      { msl: 100 }
    );
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/altitude mismatch/i);
  });
});
