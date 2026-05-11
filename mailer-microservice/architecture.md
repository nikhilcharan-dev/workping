# Architecture — Mailer Microservice

A stateless email and OTP microservice built for WorkPing. Any instance can verify any OTP because Redis is the shared source of truth.

---

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Client / Service                       │
│              (Any internal microservice or frontend)          │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTP POST (JSON)
                       │  Authorization: <SECRET>
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     Express.js Server                         │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Auth Guard  │→ │  Route Layer  │→ │   Mailer Service    │ │
│  │ (Middleware) │  │  (Routers)    │  │  (mail/mailer.js)   │ │
│  └─────────────┘  └──────────────┘  └────────┬────────────┘ │
│                                               │              │
│                   ┌───────────────────────────┤              │
│                   │                           │              │
│                   ▼                           ▼              │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │   Template Engine       │  │    Nodemailer Transport   │   │
│  │  (Handlebars)           │  │   (Gmail SMTP / Custom)   │   │
│  └────────────────────────┘  └──────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                Redis (OTP Store)                      │   │
│  │   Key: otp:email:<addr>  │  Key: otp:reset:<addr>    │   │
│  │   TTL: 30 min            │  TTL: 10 min              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
mailer-microservice/
├── server.js                  # Entry point — Express app, middleware, routes
├── package.json
├── architecture.md            # This file
├── README.md                  # Usage documentation
│
├── config/
│   ├── mailTransporter.js     # Nodemailer SMTP transport configuration
│   └── redisConfig.js         # Redis client setup
│
├── mail/
│   ├── mailer.js              # Send functions (one per template type)
│   └── templates.js           # Handlebars-compiled HTML email templates
│
├── routes/
│   ├── router.mail.js         # Mail endpoints
│   └── router.otp.js          # OTP endpoints (send, verify for email & reset)
│
└── utils/
    └── services.mail.js       # SMTP service presets
```

---

## Core Components

### Express Server (`server.js`)

| Concern | Detail |
|---------|--------|
| Port | `process.env.PORT` (default `3000`) |
| Auth | Header-based: `Authorization: <SECRET>` — applied to all `/api/*` routes |
| Public routes | `GET /` (health), `GET /templates` (template gallery) |
| Protected routes | `POST /api/v1/mail/*`, `POST /api/v1/otp/*` |

### Mail Transport (`config/mailTransporter.js`)

- Uses Nodemailer with Gmail SMTP (Google App Passwords)
- Auto-verifies connection on startup
- Swap to any SMTP provider by updating the transporter config

### Redis Store (`config/redisConfig.js`)

- **Keys:**
  - `otp:email:<email>` — email verification OTP (TTL: 30 min)
  - `otp:reset:<email>` — password reset OTP (TTL: 10 min)
- **Guarantees:** one-time use, deleted on verification

### Template Engine (`mail/templates.js`)

10 templates total:

1. OTP Verification
2. Reset Password OTP
3. Verify Password (confirmation)
4. Forgot Password (link-based)
5. Welcome / Greeting
6. Alert: Info
7. Alert: Warning
8. Alert: Danger
9. Alert: Success
10. Notification

### Mailer Service (`mail/mailer.js`)

| Function | Parameters |
|----------|-----------|
| `sendEMail` | `email, subject, content` |
| `sendEmailOTP` | `email, otp` |
| `sendResetPasswordOTP` | `email, otp` |
| `sendVerifyPassword` | `email` |
| `sendForgotPassword` | `email, resetLink` |
| `sendGreeting` | `email, name, org, role` |
| `sendAlertInfo` | `email, title, message` |
| `sendAlertWarning` | `email, title, message, actionLink` |
| `sendAlertDanger` | `email, title, message, actionLink` |
| `sendAlertSuccess` | `email, title, message` |
| `sendNotification` | `email, title, message` |
| `sendRawHTML` | `email, subject, html` |

---

## API Routes

### OTP Routes (`/api/v1/otp`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/send-email-otp` | Send email verification OTP | `{ email }` |
| `POST` | `/send-reset-password-otp` | Send password reset OTP | `{ email }` |
| `POST` | `/verify-email-otp` | Verify email OTP | `{ email, otp }` |
| `POST` | `/verify-reset-password-otp` | Verify reset password OTP | `{ email, otp }` |

### Mail Routes (`/api/v1/mail`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/send-mail` | Send templated email | `{ email, subject, content }` |
| `POST` | `/send-html` | Send raw HTML email | `{ email, subject, html }` |
| `POST` | `/forgot-password` | Forgot password link | `{ email, resetLink }` |
| `POST` | `/verify-password` | Password verified confirmation | `{ email }` |
| `POST` | `/greeting` | Welcome / onboarding email | `{ email, name, org, role }` |
| `POST` | `/alert/info` | Info alert | `{ email, title, message }` |
| `POST` | `/alert/warning` | Warning alert | `{ email, title, message, actionLink? }` |
| `POST` | `/alert/danger` | Danger alert | `{ email, title, message, actionLink? }` |
| `POST` | `/alert/success` | Success alert | `{ email, title, message }` |
| `POST` | `/notification` | Generic notification | `{ email, title, message }` |

### Public Routes (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/templates` | Visual template gallery |

---

## Security Model

```
Client Request
     │
     ▼
┌─────────────────────────┐
│   Authorization Header   │──── Missing/Invalid ──→ 403 Unauthorized
│   must equal SECRET      │
└──────────┬──────────────┘
           │ Valid
           ▼
┌─────────────────────────┐
│   Body Validation        │──── Missing email ────→ 400 Bad Request
└──────────┬──────────────┘
           │ Valid
           ▼
       Route Handler
```

- API key auth via shared `Authorization` header
- Stateless API layer — no session state
- OTP security: Redis TTL auto-expiry, single-use (deleted after verification)

---

## OTP Flow

### Email Verification

```
Client ──POST /send-email-otp──→ Server
                                   ├─ Generate 6-digit OTP
                                   ├─ Store in Redis (TTL: 30m)
                                   └─ Send via SMTP → User Inbox

Client ──POST /verify-email-otp──→ Server
                                     ├─ Fetch OTP from Redis
                                     ├─ Compare with submitted OTP
                                     ├─ Delete from Redis on match
                                     └─ Return { verified: true }
```

### Password Reset

```
Client ──POST /send-reset-password-otp──→ Server
                                            ├─ Generate 6-digit OTP
                                            ├─ Store in Redis (TTL: 10m)
                                            └─ Send via SMTP → User Inbox

Client ──POST /verify-reset-password-otp──→ Server
                                              ├─ Fetch OTP from Redis
                                              ├─ Validate & delete
                                              └─ Return { verified: true }
```

---

## Email Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `brand` | `#2563eb` | Primary accent, links, buttons |
| `success` | `#16a34a` | Success alerts |
| `warning` | `#d97706` | Warning alerts, reset password |
| `danger` | `#dc2626` | Critical alerts |
| `bg` | `#f8fafc` | Email background |
| `card` | `#ffffff` | Card background |
| `text` | `#1e293b` | Heading text |
| `muted` | `#64748b` | Body text |
| `border` | `#e2e8f0` | Borders |
| `radius` | `12px` | Border radius |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Express.js v5 |
| Email Transport | Nodemailer + Gmail SMTP |
| Template Engine | Handlebars |
| OTP Storage | Redis (with TTL) |
| Containerization | Docker & Docker Compose |
