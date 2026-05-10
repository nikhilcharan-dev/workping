# WorkPing — Security Reference

## Authentication & Authorisation

### Web Sessions (Admin + Employee Portal)
- Login issues a **short-lived JWT access token** (15 min) and a **long-lived refresh token**.
- Tokens are stored in `HttpOnly` cookies — inaccessible to JavaScript (XSS-safe).
- Refresh token rotation: every `/api/auth/refresh` call issues a new pair and invalidates the old refresh token in Redis.
- Cookie flags: `Secure` (HTTPS only), `SameSite=Strict` (CSRF mitigation).

### Mobile App
- Bearer token in `Authorization` header — same JWT, no cookies.
- Token refresh handled by the app before every API call.

### SSO — Google & Microsoft
- OAuth2 PKCE flow; `state` parameter validated to prevent CSRF on the redirect.
- On success, a WorkPing JWT is issued — the OAuth token is never forwarded to clients.

### Two-Factor Authentication (TOTP)
- Time-based OTP via `speakeasy` (RFC 6238 compliant).
- QR code setup delivered over HTTPS; secret stored server-side, never returned after setup.
- 30-second window ± 1 step for clock skew tolerance.

---

## Rate Limiting

| Scope | Limit | Window | Applied to |
|---|---|---|---|
| Global | 200 req | 15 min | All routes (`express-rate-limit`) |
| Auth | 10 req | 15 min | `/auth`, `/otp`, `/forgot-password`, `/api/auth/refresh` |

Rate limit headers follow RFC 9110 Draft 7 (`RateLimit-Policy`, `RateLimit`).
Client receives `429 Too Many Requests` with a JSON body when the limit is exceeded.

---

## Inter-Service Security

All microservice calls from the core API include:
```
Authorization: Bearer <INTERNAL_SECRET>
```
Each microservice validates this header before processing any request. The secret is different per service pair and rotated independently.

### Webhook Verification
Both the PhonePe gateway and the core API verify incoming webhook calls using **`crypto.timingSafeEqual`** — a constant-time comparison that is immune to timing-based secret enumeration.

```
Core API receives from PhonePe gateway:
  X-Webhook-Secret: <PHONEPE_SECRET>

PhonePe gateway receives from PhonePe:
  Authorization: SHA-256(username:password)
```

---

## Transport Security

- `helmet` middleware sets security headers on every response:
  - `Strict-Transport-Security` — enforces HTTPS
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection` (legacy browsers)
  - `Referrer-Policy: no-referrer`
- `contentSecurityPolicy` disabled (pure JSON API — no HTML served by core API).
- Body size limit: `10 KB` (`express.json({ limit: '10kb' })`), prevents payload inflation.

---

## Input Validation

Custom validators in `centralized-server/server/utils/validators.js`:

| Validator | Rules |
|---|---|
| `validateEmail` | RFC 5321 format, max 254 chars, lowercase-normalised |
| `validatePhone` | 10 digits, Indian format, strips non-digit characters |
| `validatePassword` | Min 8 chars, requires uppercase + lowercase + digit |
| `validateName` | Non-empty, max length, trimmed |
| `validateRequiredFields` | Rejects requests with missing required keys |

Every mutating endpoint in the core API calls at least one validator before touching the database.

---

## Credentials & Secrets Management

### Current (Phase 1)
- All secrets in `.env` files (gitignored).
- `.env.example` provided for every service with placeholder values.
- Inter-service secrets rotated manually.

### Planned (Phase 2 — see `docs/FUTURE_SCOPE.md`)
- Migrate to AWS Secrets Manager or HashiCorp Vault.
- Automated rotation for database credentials and API keys.
- Pre-commit hook to block accidental `.env` commits.

---

## Data Protection

- Passwords stored as `bcrypt` hashes (cost factor 10).
- JWT signed with `HS256`; signing secret min 32 bytes recommended.
- OTPs: 6-digit numeric, single-use, TTL-expired (deleted from Redis on first successful verify).
- Face embeddings stored as `float32` arrays in MongoDB — not reversible to the original image.

---

## CORS Policy

Production allowlist (no wildcard):
```
https://workping.live
https://www.workping.live
https://phonepe.workping.live
https://whatsapp.workping.live
<CLIENT_URL from .env>
```
Development additionally allows `localhost:5173` and `localhost:5174`.
All origins are validated server-side; invalid origins receive a `403 CORS blocked` response.
