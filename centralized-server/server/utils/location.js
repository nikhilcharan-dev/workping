/**
 * ============================================================================
 * WorkPing Core API — Server-Side 3D Geofence Validation
 * ============================================================================
 *
 * This is the SERVER-SIDE half of the attendance-location lock. The mobile
 * client (mobile-app/src/utils/locationLock.js) collects WiFi + GPS + altitude
 * and posts the snapshot to the Core API. The handlers here verify it
 * against the organisation's enrolled location config — three independent
 * layers that all must pass before a face check-in is accepted.
 *
 * ── THE 3 VALIDATION LAYERS ─────────────────────────────────────────────────
 *
 *   1. IP whitelist (corporate WiFi sanity check)
 *      • Organization's IPWhitelist is checked against the request's public IP
 *      • Server-extracted IP (X-Forwarded-For / req.ip) is the trusted source;
 *        client-supplied publicIp is only a fallback — clients CANNOT spoof
 *        the IP we ultimately compare against
 *      • Sentinels "0.0.0.0" or "0.0.0.0/0" disable IP locking entirely
 *
 *   2. GPS geofence (where you are, geographically)
 *      • Polygon mode: if the org has 3+ pinned vertices, use a Ray Casting
 *        point-in-polygon test (see isPointInPolygon below — O(n) edges,
 *        cross-product sign check at every edge intersection with a horizontal
 *        ray from the point; toggles the "inside" boolean on each crossing)
 *      • Radius mode: if only the primary pin is set, use the Haversine
 *        formula to compute great-circle distance and accept if ≤ 500 m
 *      • Hybrid: when both are configured, the polygon is checked first;
 *        if outside, fall through to a radius check against EVERY area pin
 *        so a multi-site org can have multiple allowed zones
 *      • The Haversine formula here is the standard great-circle implementation:
 *          a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
 *          c = 2·atan2(√a, √(1−a))
 *          d = R · c              (R = 6,371,000 m)
 *        This gives distance in metres without the cheap planar approximation
 *        that breaks down at high latitudes or large distances.
 *
 *   3. Altitude (anti-spoofing — defeats GPS-only emulators)
 *      • Compares device-reported altitude against the org's enrolled MSL
 *      • Tolerance: ±50 m (the typical phone altimeter accuracy)
 *      • A GPS spoofer that only lies about lat/lng but doesn't synthesise
 *        a barometric altitude will fail this check
 *      • iOS reports altitude in MSL (Mean Sea Level), Android in WGS84 —
 *        the client snapshot encodes which reference frame each value uses
 *
 * ── FAIL-OPEN BEHAVIOUR ─────────────────────────────────────────────────────
 * If the organisation has set NO location config (no IPWhitelist, no
 * coordinates, no MSL), validate3DLocation returns `allowed: true` —
 * organisations without location enrolment are not blocked from attendance.
 * This is intentional: every layer is opt-in per org.
 *
 * ── CALLED BY ───────────────────────────────────────────────────────────────
 *   controllers/web/user/attendance/controller.js  (check-in / check-out)
 *   controllers/web/user/face/controller.js        (face verification step)
 * Both invoke validate3DLocation BEFORE forwarding the face frame to the
 * biometric service so a spoofed location is rejected without burning a
 * face-api inference call.
 *
 * ── PRIVACY ────────────────────────────────────────────────────────────────
 * Public IP is NEVER trusted from the client device — even though the mobile
 * snapshot may include one as a hint, the server extracts the IP from the
 * incoming request headers and prefers that. This stops a compromised client
 * from claiming to be on the office network.
 * ============================================================================
 */

/**
 * Calculate distance between two points in meters using the Haversine formula.
 * Returns metres. R = 6,371,000 m (Earth's mean radius).
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a point is inside a polygon using Ray Casting algorithm
 * @param {object} point - { lat, lng }
 * @param {Array} polygon - Array of { lat, lng } objects
 * @returns {boolean}
 */
function isPointInPolygon(point, polygon) {
  let x = point.lat,
    y = point.lng;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].lat,
      yi = polygon[i].lng;
    let xj = polygon[j].lat,
      yj = polygon[j].lng;

    let intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Validate 3D location against organization settings
 * @param {object} provided - { wifi, gps, altitude, publicIp }
 * @param {object} allowed - { IPWhitelist, coordinates, msl }
 * @returns {object} { allowed: boolean, message: string }
 */
/**
 * @param {object} provided   - Location snapshot from client { wifi, gps, altitude, publicIp }
 * @param {object} allowed    - Organization settings { IPWhitelist, coordinates, msl, ... }
 * @param {string} serverIp   - IP extracted server-side from request headers (fallback when client
 *                              doesn't send publicIp)
 */
export function validate3DLocation(provided, allowed, serverIp = null) {
  // If no validation data is set in the organization, allow by default (as per requirement)
  const hasOrgConfig =
    (allowed.IPWhitelist && allowed.IPWhitelist.length > 0) ||
    (allowed.coordinates && allowed.coordinates.length >= 2) ||
    allowed.msl;

  if (!hasOrgConfig) {
    return { allowed: true, message: "No location restrictions set" };
  }

  // 1. IP Whitelist Check
  if (allowed.IPWhitelist && allowed.IPWhitelist.length > 0) {
    // Accept both "0.0.0.0" and "0.0.0.0/0" as universal-access sentinels
    const isUniversalAccess = allowed.IPWhitelist.some((ip) => ip === "0.0.0.0" || ip === "0.0.0.0/0");

    if (!isUniversalAccess) {
      // Client-provided IP is preferred; fall back to server-extracted IP
      const effectiveIp = provided.publicIp || serverIp;
      if (!effectiveIp || !allowed.IPWhitelist.includes(effectiveIp)) {
        return {
          allowed: false,
          message: `Unauthorized network (IP: ${effectiveIp || "Unknown"}). Please use company WiFi.`,
        };
      }
    }
  }

  // 2. Geo-fencing Check (GPS)
  if ((allowed.coordinates && allowed.coordinates.length >= 2) || (allowed.areaPins && allowed.areaPins.length > 0)) {
    if (!provided.gps || provided.gps.latitude == null || provided.gps.longitude == null) {
      return { allowed: false, message: "GPS coordinates required for verification" };
    }

    let isWithinAnyRange = false;
    let minDistance = Infinity;
    let closestPin = null;

    // A. Check Polygon (if 3+ pins exist)
    if (allowed.areaPins && allowed.areaPins.length >= 3) {
      const isInside = isPointInPolygon({ lat: provided.gps.latitude, lng: provided.gps.longitude }, allowed.areaPins);

      if (isInside) {
        isWithinAnyRange = true;
        closestPin = "Geofencing Polygon (Inside)";
      }
    }

    // B. Individual Radius Checks (Backup/Single Pin mode)
    if (!isWithinAnyRange) {
      const distance = getDistance(
        provided.gps.latitude,
        provided.gps.longitude,
        allowed.coordinates[1],
        allowed.coordinates[0]
      );
      minDistance = Math.min(minDistance, distance);
      if (distance <= 500) {
        isWithinAnyRange = true;
        closestPin = "Primary Coordinates";
      }
    }

    // Check additional area pins {lat, lng}
    if (!isWithinAnyRange && allowed.areaPins && allowed.areaPins.length > 0) {
      for (const [index, pin] of allowed.areaPins.entries()) {
        if (pin.lat == null || pin.lng == null) continue;

        const distance = getDistance(provided.gps.latitude, provided.gps.longitude, pin.lat, pin.lng);

        if (distance < minDistance) {
          minDistance = distance;
        }

        if (distance <= 500) {
          isWithinAnyRange = true;
          closestPin = `Area Pin ${index + 1}`;
          break;
        }
      }
    }

    if (!isWithinAnyRange) {
      return {
        allowed: false,
        message: `Outside allowed region (Closest pin: ${Math.round(minDistance)}m away).`,
      };
    }
  }

  // 3. MSL Check (Altitude)
  if (allowed.msl) {
    const targetMsl = parseFloat(allowed.msl);
    const providedMsl = provided.altitude?.value;

    if (providedMsl == null) {
      return { allowed: false, message: "Altitude signal required for verification" };
    }

    // Allow within 50m tolerance
    if (Math.abs(providedMsl - targetMsl) > 50) {
      return {
        allowed: false,
        message: "Security altitude mismatch. Possible spoofing detected.",
      };
    }
  }

  return { allowed: true, message: "Location verified" };
}
